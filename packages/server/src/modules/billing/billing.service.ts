import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  PaginatedResult,
  PaginationDto,
} from '../../common/dto/pagination.dto';
import { buildOrder } from '../../common/utils/sort';
import { buildInvoiceCode } from '../../common/utils/invoice-code';
import { Consumption } from '../consumption/entities/consumption.entity';
import { StorageService } from '../consumption/storage.service';
import { MeterStatus } from '../meters/entities/meter.entity';
import { SettingsService } from '../settings/settings.service';
import { BaseTariffService } from '../tariffs/base-tariff.service';
import { TariffsService } from '../tariffs/tariffs.service';
import { DiscountService } from './discount.service';
import { PaymentHistory } from './entities/payment-history.entity';
import { PaymentDiscount } from './entities/payment-discount.entity';
import { Payment, PaymentStatus } from './entities/payment.entity';
import { PayBillDto } from './dto/billing.dto';
import { FinancesService } from '../finances/finances.service';
import { FinancialResponsibilityService } from '../finances/financial-responsibility.service';
import { FinanceSourceType } from '../finances/entities/finance-transaction.entity';

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
    @InjectRepository(Consumption)
    private readonly consumptionsRepository: Repository<Consumption>,
    private readonly tariffsService: TariffsService,
    private readonly baseTariffService: BaseTariffService,
    private readonly settingsService: SettingsService,
    private readonly discountService: DiscountService,
    private readonly eventEmitter: EventEmitter2,
    private readonly storageService: StorageService,
    private readonly financesService: FinancesService,
    private readonly responsibilityService: FinancialResponsibilityService,
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
      throw new BadRequestException(
        `No existe tarifa base vigente para ${date.toLocaleDateString('es-BO')}`,
      );
    }

    // 2. Find valid range tariff for the consumption
    const rangeTariff = await this.tariffsService.getValidForDate(
      date,
      cubicMeters,
    );
    if (!rangeTariff) {
      throw new BadRequestException(
        `No existe tarifa vigente para ${cubicMeters} m³ en ${date.toLocaleDateString('es-BO')}`,
      );
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
      .leftJoinAndSelect('paymentDiscounts.discount', 'pd_discount');

    if (filters.month) {
      query.andWhere('consumption.month = :month', { month: filters.month });
    }
    if (filters.year) {
      query.andWhere('consumption.year = :year', { year: filters.year });
    }
    if (filters.status) {
      query.andWhere('payment.status = :status', { status: filters.status });
    }
    if (filters.search) {
      query.andWhere(
        '(member.first_name ILIKE :search OR member.last_name ILIKE :search OR meter.code ILIKE :search)',
        { search: `%${filters.search}%` },
      );
    }

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
      ],
    });
    if (!payment) {
      throw new NotFoundException('Payment record not found');
    }
    return payment;
  }

  /**
   * Generates a bill from a consumption record with optional multiple discounts.
   */
  async generateBill(
    consumptionId: string,
    discountIds?: string[],
  ): Promise<Payment> {
    const consumption = await this.consumptionsRepository.findOne({
      where: { id: consumptionId },
      relations: ['meter', 'meter.type', 'meter.member'],
    });
    if (!consumption) {
      throw new BadRequestException('Consumption record not found');
    }

    const existing = await this.paymentsRepository.findOne({
      where: { consumption_id: consumptionId },
    });
    if (existing) {
      throw new BadRequestException(
        'A bill already exists for this consumption',
      );
    }

    const cubicMeters = parseFloat(consumption.cubic_meters);
    const typeId = consumption.meter.type_id;
    const originalAmount = await this.calculateBillAmount(
      cubicMeters,
      undefined,
      typeId,
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
      invoice_code: invoiceCode,
    });
    const savedPayment = await this.paymentsRepository.save(payment);

    if (discountIds?.length) {
      const discountEntries = await this.applyMultipleDiscounts(
        savedPayment.id,
        originalAmount,
        discountIds,
      );
      const totalDiscount = discountEntries.reduce(
        (sum, d) => sum + parseFloat(d.amount),
        0,
      );
      savedPayment.total_amount = Math.max(
        0,
        originalAmount - totalDiscount,
      ).toFixed(2);
      savedPayment.discount_amount = totalDiscount.toFixed(2);
      await this.paymentsRepository.save(savedPayment);
    } else {
      savedPayment.total_amount = originalAmount.toFixed(2);
      await this.paymentsRepository.save(savedPayment);
    }

    const member = consumption.meter.member;
    if (member?.phone) {
      this.eventEmitter.emit('bill.generated', {
        phone: member.phone,
        phone_country: member.phone_country,
        vars: {
          member: `${member.first_name} ${member.last_name}`,
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
   * Registers a payment against a bill, optionally changing applied discounts.
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
      throw new BadRequestException('This bill has already been fully paid');
    }

    let total = parseFloat(payment.total_amount);
    const alreadyPaid = parseFloat(payment.amount_paid);
    const requestedDiscountIds: string[] = [];
    let totalDiscount = 0;

    if (dto.discountIds) {
      const originalAmount = total + parseFloat(payment.discount_amount);

      requestedDiscountIds.push(...dto.discountIds);
      for (const discountId of requestedDiscountIds) {
        const discount = await this.discountService.findOne(discountId);
        totalDiscount += this.discountService.calculateDiscountAmount(
          originalAmount,
          discount,
        );
      }
      total = Math.max(0, originalAmount - totalDiscount);
    }

    const newPaidTotal = alreadyPaid + dto.amount;

    if (newPaidTotal > total + 0.001) {
      throw new BadRequestException(
        'Payment amount exceeds the remaining balance',
      );
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

      // No relations here: Postgres rejects FOR UPDATE on the nullable side of
      // the outer joins those relations introduce.
      const fresh = await paymentsRepo.findOne({
        where: { id },
      });
      if (!fresh) throw new NotFoundException('Payment not found');
      if (fresh.status === PaymentStatus.PAID) {
        throw new BadRequestException('This bill has already been fully paid');
      }

      if (dto.discountIds) {
        const originalAmount =
          parseFloat(fresh.total_amount) + parseFloat(fresh.discount_amount);
        await discountsRepo.delete({ payment_id: fresh.id });

        await this.applyMultipleDiscounts(
          fresh.id,
          originalAmount,
          requestedDiscountIds,
          manager,
        );

        await paymentsRepo
          .createQueryBuilder()
          .update(Payment)
          .set({
            total_amount: total.toFixed(2),
            discount_amount: totalDiscount.toFixed(2),
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
        throw new ConflictException(
          'This bill was already paid or the amount exceeds its remaining balance',
        );
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
