import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PaymentHistory } from '../billing/entities/payment-history.entity';
import { ContributionPayment } from '../contributions/entities/contribution-payment.entity';
import { FinanceTransaction } from '../finances/entities/finance-transaction.entity';
import { SharePayment } from '../shares/entities/share-payment.entity';
import { AppError } from '../../common/errors/app-error';
import {
  CreatePaymentMethodDto,
  UpdatePaymentMethodDto,
} from './dto/payment-method.dto';
import { PaymentMethodEntity } from './entities/payment-method.entity';

/**
 * Default codes, mirroring the historic `PaymentMethod` enum so existing rows
 * keep resolving. Names are single-language (repository data), like every
 * other configurable list (`meter_types`, `activity_types`, ...).
 */
const DEFAULT_PAYMENT_METHODS: Array<{ code: string; name: string }> = [
  { code: 'cash', name: 'Efectivo' },
  { code: 'transfer', name: 'Transferencia' },
  { code: 'card', name: 'Tarjeta' },
  { code: 'qr', name: 'QR' },
  { code: 'other', name: 'Otro' },
];

@Injectable()
export class PaymentMethodsService implements OnModuleInit {
  private readonly logger = new Logger(PaymentMethodsService.name);

  constructor(
    @InjectRepository(PaymentMethodEntity)
    private readonly paymentMethodsRepo: Repository<PaymentMethodEntity>,
    @InjectRepository(PaymentHistory)
    private readonly paymentHistoryRepo: Repository<PaymentHistory>,
    @InjectRepository(SharePayment)
    private readonly sharePaymentRepo: Repository<SharePayment>,
    @InjectRepository(FinanceTransaction)
    private readonly financeTransactionRepo: Repository<FinanceTransaction>,
    @InjectRepository(ContributionPayment)
    private readonly contributionPaymentRepo: Repository<ContributionPayment>,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.ensureDefaults();
  }

  async ensureDefaults(): Promise<void> {
    for (const { code, name } of DEFAULT_PAYMENT_METHODS) {
      const existing = await this.paymentMethodsRepo.findOneBy({ code });
      if (!existing) {
        await this.paymentMethodsRepo.save(
          this.paymentMethodsRepo.create({ code, name }),
        );
      }
    }
    this.logger.log('Default payment methods ensured');
  }

  findAll(): Promise<PaymentMethodEntity[]> {
    return this.paymentMethodsRepo.find({ order: { name: 'ASC' } });
  }

  async findOne(id: string): Promise<PaymentMethodEntity> {
    const paymentMethod = await this.paymentMethodsRepo.findOneBy({ id });
    if (!paymentMethod) throw new AppError('PAYMENT_METHOD_NOT_FOUND');
    return paymentMethod;
  }

  async findByCode(code: string): Promise<PaymentMethodEntity | null> {
    return this.paymentMethodsRepo.findOneBy({ code });
  }

  /**
   * Resolve display names in a single query (used by CSV exports and receipts).
   */
  async namesFor(
    codes: Array<string | null | undefined>,
  ): Promise<Record<string, string>> {
    const unique = [...new Set(codes.filter((c) => !!c))] as string[];
    if (unique.length === 0) return {};
    const rows = await this.paymentMethodsRepo
      .createQueryBuilder('pm')
      .where('pm.code IN (:...codes)', { codes: unique })
      .getMany();
    const map: Record<string, string> = {};
    for (const row of rows) map[row.code] = row.name;
    return map;
  }

  /**
   * Validates a code the client submitted. `undefined`/empty is allowed
   * (payment methods are optional); any other value must exist in the table so
   * no writer can store a code that history/tables cannot resolve.
   */
  async validateCode(code: string | null | undefined): Promise<void> {
    if (!code) return;
    const existing = await this.paymentMethodsRepo.findOneBy({ code });
    if (!existing) throw new AppError('PAYMENT_METHOD_NOT_FOUND', { code });
  }

  async create(dto: CreatePaymentMethodDto): Promise<PaymentMethodEntity> {
    const code = dto.code.trim().toLowerCase();
    if (!code) throw new AppError('PAYMENT_METHOD_CODE_REQUIRED');
    const existingCode = await this.paymentMethodsRepo.findOneBy({ code });
    if (existingCode) throw new AppError('PAYMENT_METHOD_CODE_EXISTS');
    const existingName = await this.paymentMethodsRepo.findOneBy({
      name: dto.name,
    });
    if (existingName) {
      throw new AppError('PAYMENT_METHOD_NAME_EXISTS', { name: dto.name });
    }
    const paymentMethod = this.paymentMethodsRepo.create({
      code,
      name: dto.name,
    });
    return this.paymentMethodsRepo.save(paymentMethod);
  }

  async update(
    id: string,
    dto: UpdatePaymentMethodDto,
  ): Promise<PaymentMethodEntity> {
    const paymentMethod = await this.findOne(id);
    if (dto.name && dto.name !== paymentMethod.name) {
      const existingName = await this.paymentMethodsRepo.findOneBy({
        name: dto.name,
      });
      if (existingName) {
        throw new AppError('PAYMENT_METHOD_NAME_EXISTS', { name: dto.name });
      }
      paymentMethod.name = dto.name;
    }
    return this.paymentMethodsRepo.save(paymentMethod);
  }

  async remove(id: string): Promise<void> {
    const paymentMethod = await this.findOne(id);
    await this.assertNotInUse(paymentMethod.code);
    await this.paymentMethodsRepo.remove(paymentMethod);
  }

  /**
   * A payment method referenced by any historical payment cannot be deleted:
   * its code is what existing rows store and display falls back to the code.
   */
  private async assertNotInUse(code: string): Promise<void> {
    const [historyCount, shareCount, financeCount, contributionCount] =
      await Promise.all([
        this.paymentHistoryRepo.countBy({ payment_method: code }),
        this.sharePaymentRepo.countBy({ payment_method: code }),
        this.financeTransactionRepo.countBy({ payment_method: code }),
        this.contributionPaymentRepo.countBy({ payment_method: code }),
      ]);
    if (
      historyCount > 0 ||
      shareCount > 0 ||
      financeCount > 0 ||
      contributionCount > 0
    ) {
      throw new AppError('PAYMENT_METHOD_IN_USE', { code });
    }
  }
}
