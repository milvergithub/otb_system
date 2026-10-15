import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  PaginatedResult,
  PaginationDto,
} from '../../common/dto/pagination.dto';
import { buildOrder } from '../../common/utils/sort';
import { applyTokenizedSearch } from '../../common/utils/search';
import { buildInvoiceCode } from '../../common/utils/invoice-code';
import { Consumption } from '../consumption/entities/consumption.entity';
import { StorageService } from '../consumption/storage.service';
import { MeterStatus } from '../meters/entities/meter.entity';
import { SettingsService } from '../settings/settings.service';
import { BaseTariffService } from '../tariffs/base-tariff.service';
import { TariffsService } from '../tariffs/tariffs.service';
import { DiscountService } from './discount.service';
import { Surcharge, SurchargeType } from './entities/surcharge.entity';
import { PaymentSurcharge } from './entities/payment-surcharge.entity';
import { SurchargeService } from './surcharge.service';
import { PaymentHistory } from './entities/payment-history.entity';
import { PaymentDiscount } from './entities/payment-discount.entity';
import { Payment, PaymentStatus } from './entities/payment.entity';
import { PayBillDto } from './dto/billing.dto';
import { FinancesService } from '../finances/finances.service';
import { FinancialResponsibilityService } from '../finances/financial-responsibility.service';
import { FinanceSourceType } from '../finances/entities/finance-transaction.entity';
import { PaymentMethodsService } from '../payment-methods/payment-methods.service';
import { AppError } from '../../common/errors/app-error';
import { formatDateForMessage } from '../../common/i18n/format';

const SORT_COLUMNS: Record<string, string | string[]> = {
  total_amount: 'payment.total_amount',
  amount_paid: 'payment.amount_paid',
  status: 'payment.status',
  due_date: 'payment.due_date',
  created_at: 'payment.created_at',
  period: ['consumption.year', 'consumption.month'],
  member: 'member.first_name',
  usage: 'consumption.cubic_meters',
};

@Injectable()
export class BillingService {
  constructor(
    @InjectRepository(Payment)
    private readonly paymentsRepository: Repository<Payment>,
    @InjectRepository(PaymentHistory)
    private readonly historyRepository: Repository<PaymentHistory>,
    @InjectRepository(PaymentDiscount)
    private readonly paymentDiscountsRepository: Repository<PaymentDiscount>,
    @InjectRepository(PaymentSurcharge)
    private readonly paymentSurchargesRepository: Repository<PaymentSurcharge>,
    @InjectRepository(Consumption)
    private readonly consumptionsRepository: Repository<Consumption>,
    private readonly tariffsService: TariffsService,
    private readonly baseTariffService: BaseTariffService,
    private readonly settingsService: SettingsService,
    private readonly discountService: DiscountService,
    private readonly surchargeService: SurchargeService,
    private readonly eventEmitter: EventEmitter2,
    private readonly storageService: StorageService,
    private readonly financesService: FinancesService,
    private readonly responsibilityService: FinancialResponsibilityService,
    private readonly paymentMethodsService: PaymentMethodsService,
    private readonly dataSource: DataSource,
  ) {}

  /**
   * Calculates the bill amount for a consumption record.
   * formula: max(base_tariff, consumption_m3 * price_per_m3)
   * Throws if no valid tariff exists for the consumption date.
   */
  async calculateBillAmount(
    cubicMeters: number,
    consumptionDate?: Date,
    typeId?: string,
  ): Promise<number> {
    const date = consumptionDate || new Date();

    // 1. Find valid base tariff for the date and meter type
    const baseTariff = await this.baseTariffService.getValidForDate(
      date,
      typeId,
    );
    if (!baseTariff) {
      throw new AppError('NO_VALID_BASE_TARIFF', {
        date: formatDateForMessage(date),
      });
    }

    // 2. Find valid range tariff for the consumption
    const rangeTariff = await this.tariffsService.getValidForDate(
      date,
      cubicMeters,
    );
    if (!rangeTariff) {
      throw new AppError('NO_VALID_TARIFF', {
        cubicMeters,
        date: formatDateForMessage(date),
      });
    }

    // 3. Calculate total
    const consumptionTotal =
      cubicMeters * parseFloat(rangeTariff.price_per_cubic_meter);
    return Math.max(parseFloat(baseTariff.amount), consumptionTotal);
  }

  async findAll(
    pagination: PaginationDto,
    filters: {
      month?: number;
      year?: number;
      status?: PaymentStatus;
      search?: string;
      meterId?: string;
    } = {},
  ): Promise<PaginatedResult<Payment>> {
    const { page, limit, sortBy, sortOrder } = pagination;
    const query = this.paymentsRepository
      .createQueryBuilder('payment')
      .leftJoinAndSelect('payment.consumption', 'consumption')
      .leftJoinAndSelect('consumption.meter', 'meter')
      .leftJoinAndSelect('meter.member', 'member')
      .leftJoinAndSelect('payment.history', 'history')
      .leftJoinAndSelect('payment.paymentDiscounts', 'paymentDiscounts')
      .leftJoinAndSelect('paymentDiscounts.discount', 'pd_discount')
      .leftJoinAndSelect('payment.paymentSurcharges', 'paymentSurcharges')
      .leftJoinAndSelect('paymentSurcharges.surcharge', 'ps_surcharge')
      // Historical payments keep the member name even if it was logically
      // deleted afterwards.
      .withDeleted();

    if (filters.month) {
      query.andWhere('consumption.month = :month', { month: filters.month });
    }
    if (filters.year) {
      query.andWhere('consumption.year = :year', { year: filters.year });
    }
    if (filters.status) {
      query.andWhere('payment.status = :status', { status: filters.status });
    }
    if (filters.meterId) {
      query.andWhere('consumption.meter_id = :meterId', {
        meterId: filters.meterId,
      });
    }
    // Multi-word, accent-insensitive search across the meter code and the
    // member's name, so "juan martinez" and "jose" both find their matches.
    applyTokenizedSearch(query, filters.search, [
      'member.first_name',
      'member.last_name',
      'meter.code',
    ]);

    const sortColumns = buildOrder(sortBy, sortOrder, SORT_COLUMNS);
    if (sortColumns.length > 0) {
      sortColumns.forEach(({ column, dir }, index) => {
        if (index === 0) {
          query.orderBy(column, dir);
        } else {
          query.addOrderBy(column, dir);
        }
      });
    } else {
      query.orderBy('consumption.year', 'DESC');
      query.addOrderBy('consumption.month', 'DESC');
    }

    const [items, total] = await query
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string): Promise<Payment> {
    const payment = await this.paymentsRepository.findOne({
      where: { id },
      relations: [
        'consumption',
        'consumption.meter',
        'consumption.meter.member',
        'history',
        'paymentDiscounts',
        'paymentDiscounts.discount',
        'paymentSurcharges',
        'paymentSurcharges.surcharge',
      ],
      // The pay flow resolves the member from this relation; keep it visible for
      // deleted members so the central finance validation can still block new
      // movements instead of silently recording them without attribution.
      withDeleted: true,
    });
    if (!payment) {
      throw new AppError('PAYMENT_RECORD_NOT_FOUND');
    }
    return payment;
  }

  /**
   * Resolves which late-fee surcharges apply for a newly generated bill.
   * Evaluated fresh on every generation: eligibility depends ONLY on the
   * existence of at least `lateFeeMinMonths` prior bills (of THIS meter)
   * currently overdue and with a pending balance.
   *
   * Selection compatibility:
   * - `selectedSurchargeIds === undefined` (legacy clients): every default
   *   active surcharge is applied (historical behaviour).
   * - `selectedSurchargeIds = []`: the user deselected everything; no fee.
   * - `selectedSurchargeIds = [...]`: only those ids are applied. Each id is
   *   validated (exists + active) and a non-empty selection is only accepted
   *   while the bill is eligible, so the client can never bypass
   *   `late_fee_enabled` / `late_fee_min_months`.
   * Amounts are always computed here from current surcharge values — the
   * frontend never sends money figures.
   */
  public async resolveLateFee(
    consumption: Consumption,
    originalAmount: number,
    excludePaymentId?: string,
    selectedSurchargeIds?: string[],
  ): Promise<{
    surcharges: Surcharge[];
    amounts: number[];
    total: number;
    overdueCount: number;
    eligible: boolean;
    enabled: boolean;
  }> {
    const requested = selectedSurchargeIds
      ? await this.surchargeService.findSelected(selectedSurchargeIds)
      : [];

    const lateFeeEnabled = await this.settingsService.getLateFeeEnabled();
    if (!lateFeeEnabled) {
      if (requested.length > 0) {
        throw new AppError('LATE_FEE_NOT_ELIGIBLE');
      }
      return {
        surcharges: [],
        amounts: [],
        total: 0,
        overdueCount: 0,
        eligible: false,
        enabled: false,
      };
    }

    const meterId = consumption.meter_id;
    let overdueBills: Payment[] = [];
    if (meterId) {
      const qb = this.paymentsRepository
        .createQueryBuilder('payment')
        .leftJoin('payment.consumption', 'consumption')
        .where('consumption.meter_id = :meterId', { meterId })
        .andWhere("payment.status IN ('pending', 'partial', 'overdue')")
        .andWhere('payment.due_date < :today', {
          today: new Date().toISOString().slice(0, 10),
        });
      if (excludePaymentId) {
        qb.andWhere('payment.id != :excludeId', {
          excludeId: excludePaymentId,
        });
      }
      const payments = await qb.getMany();
      overdueBills = payments.filter((b) => {
        const bal = parseFloat(b.total_amount) - parseFloat(b.amount_paid);
        return bal > 0.001;
      });
    }

    const minMonths = await this.settingsService.getLateFeeMinMonths();
    const overdueCount = overdueBills.length;
    const eligible = overdueCount >= minMonths;

    if (!eligible) {
      if (requested.length > 0) {
        throw new AppError('LATE_FEE_NOT_ELIGIBLE');
      }
      return {
        surcharges: [],
        amounts: [],
        total: 0,
        overdueCount,
        eligible: false,
        enabled: true,
      };
    }

    const candidates = selectedSurchargeIds
      ? requested
      : await this.surchargeService.findDefaults();
    const amounts = candidates.map((s) =>
      this.surchargeService.calculateSurchargeAmount(originalAmount, s),
    );
    const selected = candidates.filter((_, i) => amounts[i] > 0);
    const signed = amounts.filter((n) => n > 0);
    const total = signed.reduce((a, b) => a + b, 0);
    return {
      surcharges: selected,
      amounts: signed,
      total,
      overdueCount,
      eligible: true,
      enabled: true,
    };
  }

  async generateBill(
    consumptionId: string,
    discountIds?: string[],
    surchargeIds?: string[],
  ): Promise<Payment> {
    const consumption = await this.consumptionsRepository.findOne({
      where: { id: consumptionId },
      relations: ['meter', 'meter.type', 'meter.member'],
    });
    if (!consumption) {
      throw new AppError('CONSUMPTION_NOT_FOUND');
    }

    const existing = await this.paymentsRepository.findOne({
      where: { consumption_id: consumptionId },
    });
    if (existing) {
      throw new AppError('BILL_ALREADY_EXISTS');
    }

    const cubicMeters = parseFloat(consumption.cubic_meters);
    const typeId = consumption.meter.type_id;
    const originalAmount = await this.calculateBillAmount(
      cubicMeters,
      undefined,
      typeId,
    );
    // Resolved BEFORE the payment row exists: a rejected selection (unknown id,
    // inactive surcharge, not eligible) must never leave an orphan bill that
    // would then block regeneration with BILL_ALREADY_EXISTS. The brand-new
    // payment cannot be overdue yet (0 balance), so no exclusion is needed.
    const lateFee = await this.resolveLateFee(
      consumption,
      originalAmount,
      undefined,
      surchargeIds,
    );
    const dueDay = await this.settingsService.getPaymentDueDay();

    const dueDate = new Date(consumption.year, consumption.month, dueDay);
    if (dueDate.getDate() < dueDay) {
      dueDate.setMonth(dueDate.getMonth() + 1);
    }

    const invoiceCode = buildInvoiceCode(consumption.meter.code, new Date());

    const payment = this.paymentsRepository.create({
      consumption_id: consumptionId,
      total_amount: '0',
      amount_paid: '0',
      status: PaymentStatus.PENDING,
      due_date: dueDate.toISOString().slice(0, 10),
      discount_amount: '0',
      late_fee_amount: '0',
      invoice_code: invoiceCode,
    });
    const savedPayment = await this.paymentsRepository.save(payment);

    let totalDiscount = 0;
    if (discountIds?.length) {
      const discountEntries = await this.applyMultipleDiscounts(
        savedPayment.id,
        originalAmount,
        discountIds,
      );
      totalDiscount = discountEntries.reduce(
        (sum, d) => sum + parseFloat(d.amount),
        0,
      );
    }
    let lateFeeTotal = 0;
    if (lateFee.enabled && lateFee.eligible && lateFee.surcharges.length) {
      await this.applySelectedSurcharges(
        savedPayment.id,
        lateFee.surcharges,
        lateFee.amounts,
      );
      lateFeeTotal = lateFee.total;
    }

    const netAmount = Math.max(
      0,
      originalAmount - totalDiscount + lateFeeTotal,
    );
    savedPayment.total_amount = netAmount.toFixed(2);
    savedPayment.discount_amount = totalDiscount.toFixed(2);
    savedPayment.late_fee_amount = lateFeeTotal.toFixed(2);
    await this.paymentsRepository.save(savedPayment);

    const memberForEmit = consumption.meter.member;
    if (memberForEmit?.phone) {
      this.eventEmitter.emit('bill.generated', {
        phone: memberForEmit.phone,
        phone_country: memberForEmit.phone_country,
        vars: {
          member: `${memberForEmit.first_name} ${memberForEmit.last_name}`,
          consume: cubicMeters,
          totalAmount: savedPayment.total_amount,
          contactPhone: '73767999',
        },
      });
    }

    return this.findOne(savedPayment.id);
  }

  /**
   * Auto-generates bills for all meters for a given period.
   * Bills are always at least the base tariff amount.
   */
  async generateBillsForMonth(month: number, year: number): Promise<number> {
    const consumptions = await this.consumptionsRepository.find({
      where: { month, year },
      relations: ['meter'],
    });

    let count = 0;
    for (const consumption of consumptions) {
      if (consumption.meter.status === MeterStatus.ACTIVE) {
        const existing = await this.paymentsRepository.findOne({
          where: { consumption_id: consumption.id },
        });
        if (!existing) {
          await this.generateBill(consumption.id);
          count++;
        }
      }
    }
    return count;
  }

  /**
   * Registers a payment against a bill, optionally changing applied discounts
   * and editing the late-fee surcharge selection (add / change / remove).
   *
   * Responsibility snapshot: the financially responsible user comes from the
   * water-bill configuration (never from the authenticated registrant), the
   * collector from the DTO with the centralized fallback, and registeredBy
   * from the authenticated context.
   */
  async pay(
    id: string,
    dto: PayBillDto,
    currentUserId?: string,
  ): Promise<Payment> {
    const payment = await this.findOne(id);
    if (payment.status === PaymentStatus.PAID) {
      throw new AppError('BILL_FULLY_PAID');
    }
    await this.paymentMethodsService.validateCode(dto.paymentMethod);

    const alreadyPaid = parseFloat(payment.amount_paid);
    const currentDiscount = parseFloat(payment.discount_amount);
    const currentLateFee = parseFloat(payment.late_fee_amount);
    // Original bill amount (before discounts and late fee). Discount
    // percentages and new surcharge amounts are always calculated over this
    // base, never over base + fee.
    const originalAmount =
      parseFloat(payment.total_amount) + currentDiscount - currentLateFee;

    const requestedDiscountIds: string[] = dto.discountIds ?? [];
    let totalDiscount = currentDiscount;
    if (dto.discountIds) {
      totalDiscount = 0;
      for (const discountId of requestedDiscountIds) {
        const discount = await this.discountService.findOne(discountId);
        totalDiscount += this.discountService.calculateDiscountAmount(
          originalAmount,
          discount,
        );
      }
    }

    // Late-fee selection at payment time is EDITABLE: when `surchargeIds` is
    // present (even empty) the bill's snapshot rows are replaced with the new
    // selection — the user may add, change or remove the surcharge; when it is
    // omitted the rows generated with the bill stay untouched (and no default
    // is ever applied implicitly). Persisted ids keep their snapshot amount
    // and are never re-validated (they may even be inactive by now); only NEW
    // ids go through `resolveLateFee`, which enforces exists + active and the
    // eligibility rules (late_fee_enabled + min overdue months of THIS meter,
    // excluding this bill so it never counts toward its own threshold).
    const surchargeIdsProvided = dto.surchargeIds !== undefined;
    let surchargeEntries: { surchargeId: string; amount: number }[] | null =
      null;
    let newLateFeeTotal = currentLateFee;
    if (surchargeIdsProvided) {
      const requestedIds = [...new Set(dto.surchargeIds ?? [])];
      const persistedAmountById = new Map(
        (payment.paymentSurcharges ?? []).map((ps) => [
          ps.surcharge_id,
          parseFloat(ps.amount),
        ]),
      );
      const newIds = requestedIds.filter((id) => !persistedAmountById.has(id));
      const amountByNewId = new Map<string, number>();
      if (newIds.length > 0) {
        const resolved = await this.resolveLateFee(
          payment.consumption,
          originalAmount,
          payment.id,
          newIds,
        );
        resolved.surcharges.forEach((s, i) =>
          amountByNewId.set(s.id, resolved.amounts[i]),
        );
      }
      surchargeEntries = [];
      for (const id of requestedIds) {
        const amount = persistedAmountById.has(id)
          ? persistedAmountById.get(id)
          : amountByNewId.get(id);
        if (amount !== undefined && amount > 0.001) {
          surchargeEntries.push({ surchargeId: id, amount });
        }
      }
      newLateFeeTotal = surchargeEntries.reduce(
        (sum, entry) => sum + entry.amount,
        0,
      );
    }

    const totalAfterDiscount = Math.max(0, originalAmount - totalDiscount);
    const newTotal = totalAfterDiscount + newLateFeeTotal;

    const newPaidTotal = alreadyPaid + dto.amount;

    if (newPaidTotal > newTotal + 0.001) {
      throw new AppError('PAYMENT_EXCEEDS_BALANCE');
    }

    const member = payment.consumption?.meter?.member;

    const responsibleUserId =
      await this.responsibilityService.resolveWaterBillResponsibleUserId();
    const collectorUserId = this.responsibilityService.resolveCollectorUserId(
      dto.collectorUserId,
      currentUserId,
    );

    const movement = {
      sourceType: FinanceSourceType.WATER_BILL_PAYMENT,
      amount: dto.amount,
      concept:
        `Pago de boleta de agua ${payment.consumption?.year ?? ''}-${String(payment.consumption?.month ?? '').padStart(2, '0')}`.trim(),
      memberId: member?.id ?? null,
      paymentMethod: dto.paymentMethod,
      reference: dto.reference,
      notes: dto.notes,
      responsibleUserId,
      collectorUserId,
      registeredByUserId: currentUserId ?? null,
    };

    // Fails before anything is written, so a bad reference never leaves a
    // collected bill without its ledger movement.
    await this.financesService.validateMovement({
      ...movement,
      sourceId: 'pending',
    });

    // Object storage is not transactional: the upload happens before the
    // transaction, so a later failure can leave an unreferenced evidence file.
    const evidenceKey = await this.storageService.uploadOptimizedImage(
      dto.evidenceBase64,
      'water-payment/evidence',
    );

    await this.dataSource.transaction(async (manager) => {
      const paymentsRepo = manager.getRepository(Payment);
      const historyRepo = manager.getRepository(PaymentHistory);
      const discountsRepo = manager.getRepository(PaymentDiscount);
      const surchargesRepo = manager.getRepository(PaymentSurcharge);

      // No relations here: Postgres rejects FOR UPDATE on the nullable side of
      // the outer joins those relations introduce.
      const fresh = await paymentsRepo.findOne({
        where: { id },
      });
      if (!fresh) throw new AppError('PAYMENT_NOT_FOUND');
      if (fresh.status === PaymentStatus.PAID) {
        throw new AppError('BILL_FULLY_PAID');
      }

      if (dto.discountIds || surchargeEntries) {
        if (dto.discountIds) {
          await discountsRepo.delete({ payment_id: fresh.id });

          await this.applyMultipleDiscounts(
            fresh.id,
            originalAmount,
            requestedDiscountIds,
            manager,
          );
        }

        // Full replacement of the snapshot: delete every row and re-insert the
        // kept + newly resolved ones with their amounts.
        if (surchargeEntries) {
          await surchargesRepo.delete({ payment_id: fresh.id });
          for (const entry of surchargeEntries) {
            await surchargesRepo.save(
              surchargesRepo.create({
                payment_id: fresh.id,
                surcharge_id: entry.surchargeId,
                amount: entry.amount.toFixed(2),
              }),
            );
          }
        }

        await paymentsRepo
          .createQueryBuilder()
          .update(Payment)
          .set({
            total_amount: newTotal.toFixed(2),
            ...(dto.discountIds
              ? { discount_amount: totalDiscount.toFixed(2) }
              : {}),
            ...(surchargeEntries
              ? { late_fee_amount: newLateFeeTotal.toFixed(2) }
              : {}),
          })
          .where('id = :id', { id: fresh.id })
          .execute();
      }

      const history = await historyRepo.save(
        historyRepo.create({
          payment_id: fresh.id,
          amount: dto.amount.toFixed(2),
          payment_method: dto.paymentMethod,
          reference: dto.reference,
          notes: dto.notes,
          evidence_key: evidenceKey,
        }),
      );

      // amount_paid is incremented in SQL instead of from a value read earlier:
      // two concurrent payments must add up, not overwrite each other.
      const increment = await paymentsRepo
        .createQueryBuilder()
        .update(Payment)
        .set({
          amount_paid: () => `"amount_paid" + ${dto.amount.toFixed(2)}`,
        })
        .where('id = :id', { id: fresh.id })
        .andWhere('status != :paid', { paid: PaymentStatus.PAID })
        .andWhere('"amount_paid" + :amt <= "total_amount" + 0.001', {
          amt: dto.amount.toFixed(2),
        })
        .returning(['amount_paid', 'total_amount'])
        .execute();

      if (!increment.raw?.length) {
        throw new AppError('BILL_PAID_OR_EXCEEDS_BALANCE');
      }

      const paidTotalAfter = parseFloat(increment.raw[0].amount_paid);
      const currentTotal = parseFloat(increment.raw[0].total_amount);

      const newStatus =
        paidTotalAfter >= currentTotal - 0.001
          ? PaymentStatus.PAID
          : PaymentStatus.PARTIAL;

      await paymentsRepo
        .createQueryBuilder()
        .update(Payment)
        .set({
          status: newStatus,
          paid_at:
            newStatus === PaymentStatus.PAID ? new Date() : (null as any),
        })
        .where('id = :id', { id: fresh.id })
        .execute();

      await this.financesService.recordIncome(
        { ...movement, sourceId: history.id },
        undefined,
        manager,
      );
    });

    // Re-read after the commit: inside the transaction this would use a different
    // connection and return the pre-update row.
    const paidPayment = await this.findOne(id);

    if (member?.phone && payment.consumption) {
      this.eventEmitter.emit('payment.completed', {
        paymentId: id,
        phone: member.phone,
        phone_country: member.phone_country,
        filename: `comprobante-pago-${payment.consumption.month}-${payment.consumption.year}.pdf`,
      });
    }

    return paidPayment;
  }

  /**
   * Applies multiple discounts to a payment and creates PaymentDiscount records.
   */
  private async applyMultipleDiscounts(
    paymentId: string,
    originalAmount: number,
    discountIds: string[],
    manager?: EntityManager,
  ): Promise<PaymentDiscount[]> {
    const repo = manager
      ? manager.getRepository(PaymentDiscount)
      : this.paymentDiscountsRepository;
    const entries: PaymentDiscount[] = [];
    for (const discountId of discountIds) {
      const discount = await this.discountService.findOne(discountId);
      const amount = this.discountService.calculateDiscountAmount(
        originalAmount,
        discount,
      );
      const entry = repo.create({
        payment_id: paymentId,
        discount_id: discountId,
        amount: amount.toFixed(2),
      });
      entries.push(await repo.save(entry));
    }
    return entries;
  }

  /**
   * Applies the selected late-fee surcharges to a payment and creates
   * PaymentSurcharge rows with the frozen (snapshot) amount per surcharge.
   * Amounts come from `resolveLateFee` — never from the client payload.
   */
  private async applySelectedSurcharges(
    paymentId: string,
    surcharges: Surcharge[],
    amounts: number[],
    manager?: EntityManager,
  ): Promise<PaymentSurcharge[]> {
    const repo = manager
      ? manager.getRepository(PaymentSurcharge)
      : this.paymentSurchargesRepository;
    const entries: PaymentSurcharge[] = [];
    for (let i = 0; i < surcharges.length; i++) {
      const entry = repo.create({
        payment_id: paymentId,
        surcharge_id: surcharges[i].id,
        amount: amounts[i].toFixed(2),
      });
      entries.push(await repo.save(entry));
    }
    return entries;
  }

  /**
   * Updates overdue statuses for bills past their due date.
   */
  async updateOverdueStatuses(): Promise<number> {
    const today = new Date().toISOString().slice(0, 10);
    const overdue = await this.paymentsRepository
      .createQueryBuilder('payment')
      .where('payment.status IN (:...statuses)', {
        statuses: [PaymentStatus.PENDING, PaymentStatus.PARTIAL],
      })
      .andWhere('payment.due_date < :today', { today })
      .getMany();

    for (const payment of overdue) {
      payment.status = PaymentStatus.OVERDUE;
    }
    if (overdue.length > 0) {
      await this.paymentsRepository.save(overdue);
    }
    return overdue.length;
  }
}
