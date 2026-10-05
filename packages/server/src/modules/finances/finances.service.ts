import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, In, ILike, Repository } from 'typeorm';
import {
  PaginatedResult,
  PaginationDto,
} from '../../common/dto/pagination.dto';
import { buildOrder } from '../../common/utils/sort';
import { Consumption } from '../consumption/entities/consumption.entity';
import { StorageService, StoredDocument } from '../consumption/storage.service';
import { Payment } from '../billing/entities/payment.entity';
import { PaymentMethod } from '../billing/entities/payment-history.entity';
import { Asset } from '../assets/entities/asset.entity';
import { Member } from '../members/entities/member.entity';
import { User } from '../users/entities/user.entity';
import { AssetCategory } from '../assets/entities/asset-category.entity';
import {
  FinanceCategory,
  FinanceCategoryType,
} from './entities/finance-category.entity';
import {
  FinanceDocument,
  FinanceDocumentKind,
} from './entities/finance-document.entity';
import {
  FinanceTransaction,
  FinanceSourceType,
  FinanceTransactionStatus,
  FinanceTransactionType,
} from './entities/finance-transaction.entity';
import {
  CreateFinanceTransactionDto,
  FilterFinanceDto,
  FinanceReportsFilterDto,
  UpdateFinanceTransactionDto,
  VoidFinanceTransactionDto,
} from './dto/finance-transaction.dto';
import { AddFinanceDocumentDto } from './dto/finance-document.dto';

const SORT_COLUMNS: Record<string, string> = {
  date: 'tx.date',
  amount: 'tx.amount',
  type: 'tx.type',
  concept: 'tx.concept',
  source_type: 'tx.source_type',
  category: 'category.name',
  created_at: 'tx.created_at',
};

const CATEGORY_NAME_BY_SOURCE: Record<FinanceSourceType, string | null> = {
  [FinanceSourceType.WATER_BILL_PAYMENT]: 'Pagos de agua',
  [FinanceSourceType.WATER_MEMBERSHIP_FEE]: 'Acciones de agua',
  [FinanceSourceType.FINE_PAYMENT]: 'Multas',
  [FinanceSourceType.ASSET_PURCHASE]: 'Insumos y equipos',
  [FinanceSourceType.ASSET_MAINTENANCE]: 'Mantenimiento',
  [FinanceSourceType.DONATION]: 'Donaciones',
  [FinanceSourceType.COURT_RENTAL]: 'Alquiler de cancha',
  [FinanceSourceType.OTHER]: null,
  [FinanceSourceType.MANUAL]: null,
};

const ALWAY_REQUIRES_SOURCE_ID: FinanceSourceType[] = [
  FinanceSourceType.WATER_BILL_PAYMENT,
  FinanceSourceType.WATER_MEMBERSHIP_FEE,
  FinanceSourceType.FINE_PAYMENT,
  FinanceSourceType.ASSET_PURCHASE,
  FinanceSourceType.ASSET_MAINTENANCE,
];

/**
 * Payload used by other modules to push an automatic movement into the ledger.
 * `sourceType` + `sourceId` identify the origin event and guarantee idempotency.
 */
export interface RecordFinanceMovementInput {
  sourceType: FinanceSourceType;
  sourceId: string;
  amount: number;
  concept: string;
  date?: string;
  categoryId?: string;
  paymentMethod?: PaymentMethod;
  reference?: string;
  memberId?: string | null;
  userId?: string | null;
  assetId?: string | null;
  provider?: string;
  notes?: string;
}

/**
 * Default categories seeded on boot. Automatic movements resolve their category
 * by name (see CATEGORY_NAME_BY_SOURCE), so these must exist for the automatic
 * bookkeeping to be classified instead of left uncategorized.
 */
const DEFAULT_CATEGORIES: Array<{ name: string; type: FinanceCategoryType }> = [
  { name: 'Pagos de agua', type: FinanceCategoryType.INCOME },
  { name: 'Acciones de agua', type: FinanceCategoryType.INCOME },
  { name: 'Multas', type: FinanceCategoryType.INCOME },
  { name: 'Donaciones', type: FinanceCategoryType.INCOME },
  { name: 'Alquiler de cancha', type: FinanceCategoryType.INCOME },
  { name: 'Mantenimiento', type: FinanceCategoryType.EXPENSE },
  { name: 'Servicios básicos', type: FinanceCategoryType.EXPENSE },
  { name: 'Insumos y equipos', type: FinanceCategoryType.EXPENSE },
  { name: 'Personal', type: FinanceCategoryType.EXPENSE },
];

@Injectable()
export class FinancesService implements OnModuleInit {
  private readonly logger = new Logger(FinancesService.name);

  constructor(
    @InjectRepository(FinanceTransaction)
    private readonly transactionsRepo: Repository<FinanceTransaction>,
    @InjectRepository(FinanceCategory)
    private readonly categoriesRepo: Repository<FinanceCategory>,
    @InjectRepository(FinanceDocument)
    private readonly documentsRepo: Repository<FinanceDocument>,
    @InjectRepository(Member)
    private readonly membersRepo: Repository<Member>,
    @InjectRepository(User)
    private readonly usersRepo: Repository<User>,
    @InjectRepository(Asset)
    private readonly assetsRepo: Repository<Asset>,
    @InjectRepository(Payment)
    private readonly paymentsRepo: Repository<Payment>,
    @InjectRepository(Consumption)
    private readonly consumptionsRepo: Repository<Consumption>,
    private readonly storageService: StorageService,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.seedDefaultCategories();
  }

  private async seedDefaultCategories(): Promise<void> {
    const existing = await this.categoriesRepo.find({
      select: ['name'],
    });
    const known = new Set(existing.map((c) => c.name));
    const missing = DEFAULT_CATEGORIES.filter((c) => !known.has(c.name));

    if (missing.length === 0) return;

    await this.categoriesRepo.save(
      missing.map((c) => this.categoriesRepo.create(c)),
    );
    this.logger.log(`Seeded ${missing.length} finance categories`);
  }

  async findAll(
    filter: FilterFinanceDto,
  ): Promise<PaginatedResult<FinanceTransaction>> {
    const { page, limit, sortBy, sortOrder } = filter;

    const qb = this.transactionsRepo
      .createQueryBuilder('tx')
      .leftJoinAndSelect('tx.category', 'category')
      .leftJoinAndSelect('tx.member', 'member')
      .leftJoinAndSelect('tx.user', 'user')
      .leftJoinAndSelect('tx.asset', 'asset');

    if (filter.search) {
      qb.andWhere('tx.concept ILIKE :search', { search: `%${filter.search}%` });
    }
    if (filter.type) {
      qb.andWhere('tx.type = :type', { type: filter.type });
    }
    if (filter.categoryId) {
      qb.andWhere('tx.category_id = :categoryId', {
        categoryId: filter.categoryId,
      });
    }
    if (filter.memberId) {
      qb.andWhere('tx.member_id = :memberId', { memberId: filter.memberId });
    }
    if (filter.userId) {
      qb.andWhere('tx.user_id = :userId', { userId: filter.userId });
    }
    if (filter.assetId) {
      qb.andWhere('tx.asset_id = :assetId', { assetId: filter.assetId });
    }
    if (filter.sourceType) {
      qb.andWhere('tx.source_type = :sourceType', {
        sourceType: filter.sourceType,
      });
    }
    if (filter.dateFrom) {
      qb.andWhere('tx.date >= :dateFrom', { dateFrom: filter.dateFrom });
    }
    if (filter.dateTo) {
      qb.andWhere('tx.date <= :dateTo', { dateTo: filter.dateTo });
    }

    const sortColumns = buildOrder(sortBy, sortOrder, SORT_COLUMNS);
    if (sortColumns.length > 0) {
      sortColumns.forEach(({ column, dir }, index) => {
        if (index === 0) qb.orderBy(column, dir);
        else qb.addOrderBy(column, dir);
      });
    } else {
      qb.orderBy('tx.date', 'DESC').addOrderBy('tx.created_at', 'DESC');
    }

    const [items, total] = await qb
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();
    return { items, total, page, limit, totalPages: Math.ceil(total / limit) };
  }

  async findOne(
    id: string,
    includeDocuments = false,
  ): Promise<FinanceTransaction> {
    const tx = await this.transactionsRepo.findOne({
      where: { id },
      relations: ['category', 'member', 'user', 'asset'],
    });
    if (!tx) {
      throw new NotFoundException(`Transaction ${id} not found`);
    }
    if (includeDocuments) {
      tx.documents = await this.documentsRepo.find({
        where: { transaction_id: tx.id },
        order: { created_at: 'DESC' },
      });
    }
    return tx;
  }

  async create(
    dto: CreateFinanceTransactionDto,
    userId?: string,
    manager?: EntityManager,
  ): Promise<FinanceTransaction> {
    const repo = manager
      ? manager.getRepository(FinanceTransaction)
      : this.transactionsRepo;

    await this.validateReferences(
      dto.categoryId,
      dto.memberId,
      dto.userId,
      dto.assetId,
      manager,
    );
    this.validateSource(dto);

    if (this.shouldBeUniqueBySource(dto.sourceType) && dto.sourceId) {
      const existing = await repo.findOne({
        where: { source_type: dto.sourceType, source_id: dto.sourceId },
      });
      if (existing) return existing;
    }

    const categoryId =
      dto.categoryId ?? (await this.resolveCategoryId(dto.sourceType, manager));

    const tx = repo.create({
      type: dto.type,
      date: dto.date,
      amount: dto.amount.toFixed(2),
      concept: dto.concept,
      category_id: categoryId ?? null,
      payment_method: dto.paymentMethod ?? null,
      reference: dto.reference ?? null,
      member_id: dto.memberId ?? null,
      source_type: dto.sourceType ?? null,
      source_id: dto.sourceId ?? null,
      status: FinanceTransactionStatus.ACTIVE,
      user_id: dto.userId ?? userId ?? null,
      provider: dto.provider ?? null,
      asset_id: dto.assetId ?? null,
      notes: dto.notes ?? null,
    });

    try {
      return await repo.save(tx);
    } catch (error) {
      if ((error as { code?: string }).code === '23505') {
        const existing = await repo.findOne({
          where: { source_type: dto.sourceType, source_id: dto.sourceId },
        });
        if (existing) return existing;
      }
      throw error;
    }
  }

  async update(
    id: string,
    dto: UpdateFinanceTransactionDto,
  ): Promise<FinanceTransaction> {
    const tx = await this.findOne(id);
    await this.validateReferences(
      dto.categoryId,
      dto.memberId,
      dto.userId,
      dto.assetId,
    );
    Object.assign(tx, {
      date: dto.date ?? tx.date,
      amount: dto.amount !== undefined ? dto.amount.toFixed(2) : tx.amount,
      concept: dto.concept ?? tx.concept,
      category_id: dto.categoryId ?? tx.category_id,
      payment_method: dto.paymentMethod ?? tx.payment_method,
      reference: dto.reference ?? tx.reference,
      member_id: dto.memberId ?? tx.member_id,
      source_type: dto.sourceType ?? tx.source_type,
      source_id: dto.sourceId ?? tx.source_id,
      user_id: dto.userId ?? tx.user_id,
      provider: dto.provider ?? tx.provider,
      asset_id: dto.assetId ?? tx.asset_id,
      notes: dto.notes ?? tx.notes,
    });
    return this.transactionsRepo.save(tx);
  }

  async void(
    id: string,
    dto: VoidFinanceTransactionDto,
    userId?: string,
  ): Promise<FinanceTransaction> {
    const tx = await this.findOne(id);
    if (tx.status === FinanceTransactionStatus.VOIDED) {
      throw new BadRequestException('Transaction is already voided');
    }
    tx.status = FinanceTransactionStatus.VOIDED;
    tx.voided_at = new Date();
    tx.voided_reason = dto.reason ?? null;
    tx.voided_by = userId ?? null;
    return this.transactionsRepo.save(tx);
  }

  async getDocuments(transactionId: string): Promise<FinanceDocument[]> {
    return this.documentsRepo.find({
      where: { transaction_id: transactionId },
      order: { created_at: 'DESC' },
    });
  }

  async addDocument(
    transactionId: string,
    dto: AddFinanceDocumentDto,
    userId?: string,
  ): Promise<FinanceDocument> {
    const tx = await this.findOne(transactionId);

    let stored: StoredDocument | null;
    try {
      stored = await this.storageService.uploadDocument(
        dto.fileBase64,
        'finances/documents',
        dto.fileName,
      );
    } catch (error) {
      throw new BadRequestException((error as Error).message);
    }
    if (!stored) {
      throw new BadRequestException('Could not store the uploaded document');
    }

    return this.documentsRepo.save(
      this.documentsRepo.create({
        transaction_id: tx.id,
        file_key: stored.file_key,
        file_name: stored.file_name,
        mime_type: stored.mime_type,
        file_size: stored.file_size,
        kind:
          dto.kind ??
          (stored.mime_type.startsWith('image/')
            ? FinanceDocumentKind.PHOTO
            : FinanceDocumentKind.RECEIPT),
        uploaded_by: userId ?? null,
      }),
    );
  }

  async removeDocument(
    transactionId: string,
    documentId: string,
  ): Promise<void> {
    const doc = await this.documentsRepo.findOneBy({
      id: documentId,
      transaction_id: transactionId,
    });
    if (!doc)
      throw new NotFoundException(`Finance document ${documentId} not found`);

    await this.documentsRepo.remove(doc);
    try {
      await this.storageService.delete(doc.file_key);
    } catch (error) {
      this.logger.warn(
        `Could not delete stored object ${doc.file_key}: ${(error as Error).message}`,
      );
    }
  }

  async getDocumentContent(
    transactionId: string,
    documentId: string,
  ): ReturnType<StorageService['getObjectStream']> {
    const doc = await this.documentsRepo.findOneBy({
      id: documentId,
      transaction_id: transactionId,
    });
    if (!doc)
      throw new NotFoundException(`Finance document ${documentId} not found`);
    return this.storageService.getObjectStream(doc.file_key);
  }

  async getSummary(
    startDate?: string,
    endDate?: string,
  ): Promise<{
    income: number;
    expense: number;
    balance: number;
    voided: number;
  }> {
    const items = await this.transactionsRepo
      .createQueryBuilder('tx')
      .select('tx.type', 'type')
      .addSelect('SUM(tx.amount)', 'total')
      .where('tx.status = :status', { status: FinanceTransactionStatus.ACTIVE })
      .andWhere(buildDateFilter(startDate, endDate, 'tx'))
      .groupBy('tx.type')
      .getRawMany<{ type: string; total: string }>();

    let income = 0;
    let expense = 0;
    for (const row of items) {
      if (row.type === 'income') income = Number(row.total);
      if (row.type === 'expense') expense = Number(row.total);
    }
    const voided = await this.transactionsRepo.count({
      where: { status: FinanceTransactionStatus.VOIDED },
    });
    return { income, expense, balance: income - expense, voided };
  }

  async getByCategory(
    startDate?: string,
    endDate?: string,
    type?: FinanceTransactionType,
  ): Promise<{ type: string; category: string; total: number }[]> {
    const query = this.transactionsRepo
      .createQueryBuilder('tx')
      .leftJoin('tx.category', 'category')
      .select('tx.type', 'type')
      .addSelect("COALESCE(category.name, 'Sin categoría')", 'category')
      .addSelect('SUM(tx.amount)', 'total')
      .where('tx.status = :status', { status: FinanceTransactionStatus.ACTIVE })
      .groupBy('tx.type')
      .addGroupBy('category.id');

    if (startDate) query.andWhere('tx.date >= :startDate', { startDate });
    if (endDate) query.andWhere('tx.date <= :endDate', { endDate });
    if (type) query.andWhere('tx.type = :type', { type });

    const rows = await query.getRawMany<{
      type: string;
      category: string;
      total: string;
    }>();
    return rows.map((row) => ({
      type: row.type,
      category: row.category,
      total: Number(row.total),
    }));
  }

  async getByPaymentMethod(
    startDate?: string,
    endDate?: string,
  ): Promise<{ method: string; total: number }[]> {
    const query = this.transactionsRepo
      .createQueryBuilder('tx')
      .select('tx.payment_method', 'method')
      .addSelect('SUM(tx.amount)', 'total')
      .where('tx.status = :status', { status: FinanceTransactionStatus.ACTIVE })
      .andWhere('tx.payment_method IS NOT NULL')
      .groupBy('tx.payment_method');

    if (startDate) query.andWhere('tx.date >= :startDate', { startDate });
    if (endDate) query.andWhere('tx.date <= :endDate', { endDate });

    const rows = await query.getRawMany<{ method: string; total: string }>();
    return rows.map((row) => ({
      method: row.method,
      total: Number(row.total),
    }));
  }

  async getMonthlySeries(
    startDate?: string,
    endDate?: string,
  ): Promise<{ year: number; month: number; type: string; total: number }[]> {
    const rows = await this.transactionsRepo
      .createQueryBuilder('tx')
      .select('EXTRACT(YEAR FROM tx.date)::int', 'year')
      .addSelect('EXTRACT(MONTH FROM tx.date)::int', 'month')
      .addSelect('tx.type', 'type')
      .addSelect('SUM(tx.amount)', 'total')
      .where('tx.status = :status', { status: FinanceTransactionStatus.ACTIVE })
      .groupBy('EXTRACT(YEAR FROM tx.date)')
      .addGroupBy('EXTRACT(MONTH FROM tx.date)')
      .addGroupBy('tx.type')
      .orderBy('EXTRACT(YEAR FROM tx.date)', 'ASC')
      .addOrderBy('EXTRACT(MONTH FROM tx.date)', 'ASC')
      .getRawMany();

    return rows.map((r) => ({
      year: Number(r.year),
      month: Number(r.month),
      type: r.type,
      total: Number(r.total),
    }));
  }

  async getWaterReport(
    startDate?: string,
    endDate?: string,
  ): Promise<{
    billed: number;
    collected: number;
    pending: number;
    source?: string;
  }> {
    const startYear = startDate
      ? parseInt(startDate.substring(0, 4), 10)
      : new Date().getFullYear();
    const startMonth = startDate ? parseInt(startDate.substring(5, 7), 10) : 1;
    const endYear = endDate
      ? parseInt(endDate.substring(0, 4), 10)
      : new Date().getFullYear();
    const endMonth = endDate ? parseInt(endDate.substring(5, 7), 10) : 12;

    const monthlyPayments = await this.paymentsRepo
      .createQueryBuilder('payment')
      .leftJoinAndSelect('payment.consumption', 'consumption')
      .where(
        '(consumption.year > :startYear OR (consumption.year = :startYear AND consumption.month >= :startMonth))',
        { startYear, startMonth },
      )
      .andWhere(
        '(consumption.year < :endYear OR (consumption.year = :endYear AND consumption.month <= :endMonth))',
        { endYear, endMonth },
      )
      .getMany();

    let billed = 0;
    let collected = 0;
    for (const p of monthlyPayments) {
      billed += parseFloat(p.total_amount);
      collected += parseFloat(p.amount_paid);
    }
    const pending = Math.max(0, billed - collected);
    return { billed, collected, pending };
  }

  async exportCsv(startDate?: string, endDate?: string): Promise<string> {
    const items = await this.transactionsRepo
      .createQueryBuilder('tx')
      .leftJoinAndSelect('tx.category', 'category')
      .leftJoinAndSelect('tx.member', 'member')
      .leftJoinAndSelect('tx.user', 'user')
      .leftJoinAndSelect('tx.asset', 'asset')
      .where('tx.status = :status', { status: FinanceTransactionStatus.ACTIVE })
      .andWhere(buildDateFilter(startDate, endDate, 'tx'))
      .orderBy('tx.date', 'DESC')
      .getMany();

    const header = [
      'Fecha',
      'Tipo',
      'Concepto',
      'Monto',
      'Categoría',
      'Método pago',
      'Socio',
      'Usuario',
      'Proveedor',
      'Bien',
      'Origen',
      'Referencia',
    ].join(',');

    const rows = items.map((tx) => {
      const member = tx.member
        ? `${tx.member.first_name} ${tx.member.last_name}`
        : '';
      return [
        this.csvValue(tx.date),
        this.csvValue(tx.type),
        this.csvValue(tx.concept),
        this.csvValue(tx.amount),
        this.csvValue(tx.category?.name ?? 'Sin categoría'),
        this.csvValue(tx.payment_method),
        this.csvValue(member),
        this.csvValue(tx.user?.full_name),
        this.csvValue(tx.provider),
        this.csvValue(tx.asset?.code),
        this.csvValue(tx.source_type),
        this.csvValue(tx.reference),
      ].join(',');
    });

    return [header, ...rows].join('\n');
  }

  private csvValue(value?: unknown): string {
    if (value === null || value === undefined) return '';
    const s = String(value);
    if (/[",]/.test(s)) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  }

  private buildDateFilter(
    startDate?: string,
    endDate?: string,
    alias?: string,
  ): string {
    const parts: string[] = [];
    if (startDate) parts.push(`${alias}.date >= '${startDate}'`);
    if (endDate) parts.push(`${alias}.date <= '${endDate}'`);
    return parts.join(' AND ') || '1=1';
  }

  /**
   * Registers an income coming from another module (water, fines, assets).
   * Idempotent: the (sourceType, sourceId) pair identifies the origin event,
   * so replaying the same event never duplicates the movement.
   * Never throws, so a finance bookkeeping failure cannot break the origin flow.
   */
  async recordIncome(
    input: RecordFinanceMovementInput,
    userId?: string,
    manager?: EntityManager,
  ): Promise<FinanceTransaction | null> {
    return this.recordMovement(
      FinanceTransactionType.INCOME,
      input,
      userId,
      manager,
    );
  }

  /**
   * Registers an expense coming from another module (asset purchases/maintenance).
   * Idempotent through the (sourceType, sourceId) pair, so paying the same
   * fine twice can never duplicate the movement.
   *
   * When `manager` is provided the write joins that transaction and failures
   * propagate, so the caller can roll the origin row back together with the
   * movement. Without it the call is best-effort and never throws.
   */
  async recordExpense(
    input: RecordFinanceMovementInput,
    userId?: string,
    manager?: EntityManager,
  ): Promise<FinanceTransaction | null> {
    return this.recordMovement(
      FinanceTransactionType.EXPENSE,
      input,
      userId,
      manager,
    );
  }

  /**
   * Checks that an automatic movement can be written before the caller performs
   * its own write, so a bad category/member/asset reference surfaces as a clear
   * validation error instead of a silently dropped movement.
   */
  async validateMovement(
    input: RecordFinanceMovementInput,
    manager?: EntityManager,
  ): Promise<void> {
    await this.validateReferences(
      input.categoryId,
      input.memberId,
      input.userId,
      input.assetId,
      manager,
    );
    this.validateSource({
      sourceType: input.sourceType,
      sourceId: input.sourceId,
    });
  }

  private async recordMovement(
    type: FinanceTransactionType,
    input: RecordFinanceMovementInput,
    userId?: string,
    manager?: EntityManager,
  ): Promise<FinanceTransaction | null> {
    if (!Number.isFinite(input.amount) || input.amount <= 0) {
      this.logger.warn(
        `Skipping finance movement ${input.sourceType}/${input.sourceId}: invalid amount ${input.amount}`,
      );
      return null;
    }

    const dto = {
      type,
      date: input.date ?? today(),
      amount: input.amount,
      concept: input.concept,
      categoryId: input.categoryId,
      paymentMethod: input.paymentMethod,
      reference: input.reference,
      memberId: input.memberId ?? undefined,
      userId: input.userId ?? undefined,
      assetId: input.assetId ?? undefined,
      provider: input.provider,
      sourceType: input.sourceType,
      sourceId: input.sourceId,
      notes: input.notes,
    };

    if (manager) {
      return this.create(dto, userId, manager);
    }

    try {
      return await this.create(dto, userId);
    } catch (error) {
      this.logger.error(
        `Failed to record ${type} for ${input.sourceType}/${input.sourceId}: ${
          (error as Error).message
        }`,
      );
      return null;
    }
  }

  private async validateReferences(
    categoryId?: string | null,
    memberId?: string | null,
    userId?: string | null,
    assetId?: string | null,
    manager?: EntityManager,
  ): Promise<void> {
    const categoriesRepo = manager
      ? manager.getRepository(FinanceCategory)
      : this.categoriesRepo;
    const membersRepo = manager
      ? manager.getRepository(Member)
      : this.membersRepo;
    const usersRepo = manager ? manager.getRepository(User) : this.usersRepo;
    const assetsRepo = manager ? manager.getRepository(Asset) : this.assetsRepo;

    if (categoryId) {
      const cat = await categoriesRepo.findOneBy({ id: categoryId });
      if (!cat) throw new BadRequestException('Category not found');
    }
    if (memberId) {
      const m = await membersRepo.findOneBy({ id: memberId });
      if (!m) throw new BadRequestException('Member not found');
    }
    if (userId) {
      const u = await usersRepo.findOneBy({ id: userId });
      if (!u) throw new BadRequestException('User not found');
    }
    if (assetId) {
      const a = await assetsRepo.findOneBy({ id: assetId });
      if (!a) throw new BadRequestException('Asset not found');
    }
  }

  private validateSource(dto: {
    sourceType?: FinanceSourceType;
    sourceId?: string;
  }): void {
    if (!dto.sourceType) return;
    if (ALWAY_REQUIRES_SOURCE_ID.includes(dto.sourceType) && !dto.sourceId) {
      throw new BadRequestException(
        `sourceId is required when sourceType is ${dto.sourceType}`,
      );
    }
  }

  private shouldBeUniqueBySource(sourceType?: FinanceSourceType): boolean {
    return (
      sourceType !== undefined && ALWAY_REQUIRES_SOURCE_ID.includes(sourceType)
    );
  }

  private async resolveCategoryId(
    sourceType?: FinanceSourceType,
    manager?: EntityManager,
  ): Promise<string | null> {
    if (!sourceType) return null;
    const name = CATEGORY_NAME_BY_SOURCE[sourceType];
    if (!name) return null;
    const repo = manager
      ? manager.getRepository(FinanceCategory)
      : this.categoriesRepo;
    const category = await repo.findOne({ where: { name } });
    return category?.id ?? null;
  }
}

function today(): string {
  return new Date().toISOString().split('T')[0];
}

function buildDateFilter(
  startDate?: string,
  endDate?: string,
  alias?: string,
): string {
  const parts: string[] = [];
  if (startDate) parts.push(`${alias}.date >= '${startDate}'`);
  if (endDate) parts.push(`${alias}.date <= '${endDate}'`);
  return parts.join(' AND ') || '1=1';
}
