import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
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
   */
  async pay(id: string, dto: PayBillDto): Promise<Payment> {
    const payment = await this.findOne(id);
    if (payment.status === PaymentStatus.PAID) {
      throw new BadRequestException('This bill has already been fully paid');
    }

    let total = parseFloat(payment.total_amount);
    const alreadyPaid = parseFloat(payment.amount_paid);

    if (dto.discountIds) {
      const originalAmount = total + parseFloat(payment.discount_amount);

      await this.paymentDiscountsRepository.delete({ payment_id: payment.id });

      if (dto.discountIds.length > 0) {
        const discountEntries = await this.applyMultipleDiscounts(
          payment.id,
          originalAmount,
          dto.discountIds,
        );
        const totalDiscount = discountEntries.reduce(
          (sum, d) => sum + parseFloat(d.amount),
          0,
        );
        total = Math.max(0, originalAmount - totalDiscount);

        await this.paymentsRepository
          .createQueryBuilder()
          .update(Payment)
          .set({
            total_amount: total.toFixed(2),
            discount_amount: totalDiscount.toFixed(2),
          })
          .where('id = :id', { id: payment.id })
          .execute();
      } else {
        total = originalAmount;
        await this.paymentsRepository
          .createQueryBuilder()
          .update(Payment)
          .set({
            total_amount: originalAmount.toFixed(2),
            discount_amount: '0',
          })
          .where('id = :id', { id: payment.id })
          .execute();
      }
    }

    const newPaidTotal = alreadyPaid + dto.amount;

    if (newPaidTotal > total + 0.001) {
      throw new BadRequestException(
        'Payment amount exceeds the remaining balance',
      );
    }

    const evidenceKey = await this.storageService.uploadOptimizedImage(
      dto.evidenceBase64,
      'water-payment/evidence',
    );

    await this.historyRepository
      .createQueryBuilder()
      .insert()
      .into(PaymentHistory)
      .values({
        payment_id: payment.id,
        amount: dto.amount.toFixed(2),
        payment_method: dto.paymentMethod,
        reference: dto.reference,
        notes: dto.notes,
        evidence_key: evidenceKey,
      })
      .execute();

    const newStatus =
      newPaidTotal >= total - 0.001
        ? PaymentStatus.PAID
        : PaymentStatus.PARTIAL;

    await this.paymentsRepository
      .createQueryBuilder()
      .update(Payment)
      .set({
        amount_paid: newPaidTotal.toFixed(2),
        status: newStatus,
        paid_at: newStatus === PaymentStatus.PAID ? new Date() : (null as any),
      })
      .where('id = :id', { id: payment.id })
      .execute();

    const paidPayment = await this.findOne(id);
    const member = paidPayment.consumption?.meter?.member;
    if (member?.phone && paidPayment.consumption) {
      this.eventEmitter.emit('payment.completed', {
        paymentId: id,
        phone: member.phone,
        phone_country: member.phone_country,
        filename: `comprobante-pago-${paidPayment.consumption.month}-${paidPayment.consumption.year}.pdf`,
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
  ): Promise<PaymentDiscount[]> {
    const entries: PaymentDiscount[] = [];
    for (const discountId of discountIds) {
      const discount = await this.discountService.findOne(discountId);
      const amount = this.discountService.calculateDiscountAmount(
        originalAmount,
        discount,
      );
      const entry = this.paymentDiscountsRepository.create({
        payment_id: paymentId,
        discount_id: discountId,
        amount: amount.toFixed(2),
      });
      entries.push(await this.paymentDiscountsRepository.save(entry));
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
