import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { setImmediate } from 'node:timers';
import { DataSource, In, Repository } from 'typeorm';
import {
  PaginatedResult,
  PaginationDto,
} from '../../common/dto/pagination.dto';
import { buildOrder } from '../../common/utils/sort';
import { StorageService } from '../consumption/storage.service';
import { Member } from '../members/entities/member.entity';
import { User } from '../users/entities/user.entity';
import { FinanceDocument } from '../finances/entities/finance-document.entity';
import { FinanceAccess, FinancesService } from '../finances/finances.service';
import { FilterFinanceDto } from '../finances/dto/finance-transaction.dto';
import { PaymentMethodsService } from '../payment-methods/payment-methods.service';
import {
  FinanceSourceType,
  FinanceTransaction,
  FinanceTransactionType,
} from '../finances/entities/finance-transaction.entity';
import { ContributionPaymentStatus } from './entities/contribution-payment.entity';
import {
  Contribution,
  ContributionStatus,
} from './entities/contribution.entity';
import {
  ContributionObligation,
  ContributionObligationStatus,
} from './entities/contribution-obligation.entity';
import { ContributionPayment } from './entities/contribution-payment.entity';
import { AppError } from '../../common/errors/app-error';
import type { ErrorCode } from '../../common/errors/error-codes';
import {
  AddMembersDto,
  CancelContributionDto,
  CancelObligationDto,
  CreateContributionDto,
  ExonerateObligationDto,
  FilterContributionsDto,
  FilterObligationsDto,
  PayContributionDto,
  UpdateContributionDto,
  VoidContributionPaymentDto,
} from './dto/contribution.dto';

/**
 * Monetary tolerance used by the system when comparing sums of rounded values
 * (same tolerance as `billing.pay`, which compares `amount_paid + amount`).
 */
const MONEY_TOLERANCE = 0.001;

const SORT_COLUMNS: Record<string, string> = {
  title: 'c.title',
  amount_per_member: 'c.amount_per_member',
  status: 'c.status',
  created_at: 'c.created_at',
  activated_at: 'c.activated_at',
};

const OBLIGATION_SORT_COLUMNS: Record<string, string> = {
  member: 'member.last_name',
  amount: 'o.amount',
  status: 'o.status',
  created_at: 'o.created_at',
};

/** Allowed lifecycle transitions. Anything else is rejected. */
const ALLOWED_TRANSITIONS: Record<ContributionStatus, ContributionStatus[]> = {
  [ContributionStatus.DRAFT]: [
    ContributionStatus.ACTIVE,
    ContributionStatus.CANCELLED,
  ],
  [ContributionStatus.ACTIVE]: [
    ContributionStatus.PAUSED,
    ContributionStatus.COMPLETED,
    ContributionStatus.CANCELLED,
  ],
  [ContributionStatus.PAUSED]: [
    ContributionStatus.ACTIVE,
    ContributionStatus.COMPLETED,
    ContributionStatus.CANCELLED,
  ],
  [ContributionStatus.COMPLETED]: [],
  [ContributionStatus.CANCELLED]: [],
};

export interface ContributionSummary {
  contribution: Contribution;
  obligations: {
    total: number;
    pending: number;
    partial: number;
    paid: number;
    exonerated: number;
    cancelled: number;
    expectedAmount: number;
    exoneratedAmount: number;
    collectedAmount: number;
    pendingRecoveryAmount: number;
  };
  finance: {
    income: number;
    expenses: number;
    balance: number;
  };
}

@Injectable()
export class ContributionsService {
  constructor(
    @InjectRepository(Contribution)
    private readonly repo: Repository<Contribution>,
    @InjectRepository(ContributionObligation)
    private readonly obligationsRepo: Repository<ContributionObligation>,
    @InjectRepository(ContributionPayment)
    private readonly paymentsRepo: Repository<ContributionPayment>,
    @InjectRepository(Member)
    private readonly membersRepo: Repository<Member>,
    @InjectRepository(User)
    private readonly usersRepo: Repository<User>,
    @InjectRepository(FinanceDocument)
    private readonly financeDocumentsRepo: Repository<FinanceDocument>,
    private readonly financesService: FinancesService,
    private readonly storageService: StorageService,
    private readonly eventEmitter: EventEmitter2,
    private readonly paymentMethodsService: PaymentMethodsService,
    private readonly dataSource: DataSource,
  ) {}

  // ---------------------------------------------------------------------
  // Authorization
  // ---------------------------------------------------------------------

  /**
   * Without `contributions.all` a campaign is visible only to its creator,
   * its rendición responsible and its collector.
   */
  private assertCanView(
    contribution: Contribution,
    userId: string,
    canViewAll: boolean,
  ): void {
    if (canViewAll) return;
    const isCreator = contribution.created_by === userId;
    const isResponsible = contribution.responsible_user_id === userId;
    const isCollector = contribution.collector_user_id === userId;
    if (!isCreator && !isResponsible && !isCollector) {
      throw new AppError('CONTRIBUTION_FORBIDDEN');
    }
  }

  /** Management (edit/transition): creator, rendición responsible, or all. */
  private assertCanManage(
    contribution: Contribution,
    userId: string,
    canViewAll: boolean,
  ): void {
    if (canViewAll) return;
    const isCreator = contribution.created_by === userId;
    const isResponsible = contribution.responsible_user_id === userId;
    if (!isCreator && !isResponsible) {
      throw new AppError('CONTRIBUTION_NOT_MODIFIABLE');
    }
  }

  private assertTransition(
    from: ContributionStatus,
    to: ContributionStatus,
  ): void {
    const allowed = ALLOWED_TRANSITIONS[from] ?? [];
    if (!allowed.includes(to)) {
      throw new AppError('CONTRIBUTION_STATUS_TRANSITION_INVALID', {
        from,
        to,
      });
    }
  }

  private async validateUserRef(
    userId: string | null | undefined,
    missingCode: ErrorCode,
  ): Promise<void> {
    if (!userId) return;
    const user = await this.usersRepo.findOneBy({ id: userId });
    if (!user) throw new AppError(missingCode);
  }

  // ---------------------------------------------------------------------
  // CRUD
  // ---------------------------------------------------------------------

  async create(
    dto: CreateContributionDto,
    userId: string,
  ): Promise<Contribution> {
    await this.validateUserRef(
      dto.collectorUserId,
      'CONTRIBUTION_COLLECTOR_NOT_FOUND',
    );
    await this.validateUserRef(
      dto.responsibleUserId,
      'CONTRIBUTION_RESPONSIBLE_NOT_FOUND',
    );

    const entity = this.repo.create({
      title: dto.title,
      purpose: dto.purpose ?? null,
      amount_per_member: dto.amountPerMember.toFixed(2),
      status: ContributionStatus.DRAFT,
      collector_user_id: dto.collectorUserId ?? null,
      responsible_user_id: dto.responsibleUserId ?? null,
      notes: dto.notes ?? null,
      created_by: userId,
    });
    const saved = await this.repo.save(entity);
    return this.findOne(saved.id, userId, true);
  }

  async findAll(
    pagination: PaginationDto,
    userId: string,
    canViewAll: boolean,
    filters: Partial<FilterContributionsDto> = {},
  ): Promise<PaginatedResult<Contribution>> {
    const { page, limit, sortBy, sortOrder } = pagination;

    const qb = this.repo
      .createQueryBuilder('c')
      .leftJoinAndSelect('c.creator', 'creator')
      .leftJoinAndSelect('c.responsibleUser', 'responsibleUser')
      .leftJoinAndSelect('c.collectorUser', 'collectorUser');

    if (!canViewAll) {
      qb.where(
        '(c.created_by = :userId OR c.responsible_user_id = :userId OR c.collector_user_id = :userId)',
        { userId },
      );
    }

    if (filters.search) {
      qb.andWhere('(c.title ILIKE :search OR c.purpose ILIKE :search)', {
        search: `%${filters.search}%`,
      });
    }
    if (filters.status) {
      qb.andWhere('c.status = :status', { status: filters.status });
    }
    if (filters.collectorUserId) {
      qb.andWhere('c.collector_user_id = :collectorUserId', {
        collectorUserId: filters.collectorUserId,
      });
    }
    if (filters.responsibleUserId) {
      qb.andWhere('c.responsible_user_id = :responsibleUserId', {
        responsibleUserId: filters.responsibleUserId,
      });
    }

    const sortColumns = buildOrder(sortBy, sortOrder, SORT_COLUMNS);
    if (sortColumns.length > 0) {
      sortColumns.forEach(({ column, dir }, index) => {
        if (index === 0) qb.orderBy(column, dir);
        else qb.addOrderBy(column, dir);
      });
    } else {
      qb.orderBy('c.created_at', 'DESC');
    }

    const [items, total] = await qb
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

  async findOne(
    id: string,
    userId?: string,
    canViewAll = false,
  ): Promise<Contribution> {
    const contribution = await this.repo.findOne({
      where: { id },
      relations: ['creator', 'responsibleUser', 'collectorUser'],
    });
    if (!contribution) throw new AppError('CONTRIBUTION_NOT_FOUND');
    if (userId) this.assertCanView(contribution, userId, canViewAll);
    return contribution;
  }

  async update(
    id: string,
    dto: UpdateContributionDto,
    userId: string,
    canViewAll: boolean,
  ): Promise<Contribution> {
    const entity = await this.findOne(id, userId, canViewAll);
    this.assertCanManage(entity, userId, canViewAll);

    if (entity.status !== ContributionStatus.DRAFT) {
      if (dto.amountPerMember !== undefined) {
        throw new AppError('CONTRIBUTION_AMOUNT_LOCKED');
      }
      if (
        dto.collectorUserId !== undefined ||
        dto.responsibleUserId !== undefined
      ) {
        throw new AppError('CONTRIBUTION_RESPONSIBLE_LOCKED');
      }
    }

    if (dto.collectorUserId !== undefined) {
      await this.validateUserRef(
        dto.collectorUserId,
        'CONTRIBUTION_COLLECTOR_NOT_FOUND',
      );
    }
    if (dto.responsibleUserId !== undefined) {
      await this.validateUserRef(
        dto.responsibleUserId,
        'CONTRIBUTION_RESPONSIBLE_NOT_FOUND',
      );
    }

    const patch: Partial<Contribution> = {
      title: dto.title ?? entity.title,
      purpose: dto.purpose !== undefined ? dto.purpose : entity.purpose,
      amount_per_member:
        dto.amountPerMember !== undefined
          ? dto.amountPerMember.toFixed(2)
          : entity.amount_per_member,
      collector_user_id:
        dto.collectorUserId !== undefined
          ? dto.collectorUserId
          : entity.collector_user_id,
      responsible_user_id:
        dto.responsibleUserId !== undefined
          ? dto.responsibleUserId
          : entity.responsible_user_id,
      notes: dto.notes !== undefined ? dto.notes : entity.notes,
    };
    // Raw update: the entity carries loaded user relations and `save()` would
    // overwrite the changed FK columns with those stale objects.
    await this.repo.update(entity.id, patch);
    return this.findOne(id, userId, canViewAll);
  }

  async remove(id: string, userId: string, canViewAll: boolean): Promise<void> {
    const entity = await this.findOne(id, userId, canViewAll);
    this.assertCanManage(entity, userId, canViewAll);

    if (entity.status !== ContributionStatus.DRAFT) {
      throw new AppError('CONTRIBUTION_ONLY_DRAFT_DELETABLE');
    }
    const obligations = await this.obligationsRepo.count({
      where: { contribution_id: id },
    });
    if (obligations > 0) {
      throw new AppError('CONTRIBUTION_HAS_OBLIGATIONS');
    }
    await this.repo.remove(entity);
  }

  // ---------------------------------------------------------------------
  // Lifecycle
  // ---------------------------------------------------------------------

  async activate(
    id: string,
    userId: string,
    canViewAll: boolean,
  ): Promise<Contribution> {
    const entity = await this.findOne(id, userId, canViewAll);
    this.assertCanManage(entity, userId, canViewAll);
    this.assertTransition(entity.status, ContributionStatus.ACTIVE);

    if (!entity.collector_user_id) {
      throw new AppError('CONTRIBUTION_COLLECTOR_REQUIRED');
    }
    if (!entity.responsible_user_id) {
      throw new AppError('CONTRIBUTION_RENDERER_REQUIRED');
    }
    const obligations = await this.obligationsRepo.count({
      where: { contribution_id: id },
    });
    if (obligations === 0) {
      throw new AppError('CONTRIBUTION_REQUIRES_MEMBERS');
    }

    await this.repo.update(id, {
      status: ContributionStatus.ACTIVE,
      activated_at: new Date(),
    });
    return this.findOne(id, userId, canViewAll);
  }

  async pause(
    id: string,
    userId: string,
    canViewAll: boolean,
  ): Promise<Contribution> {
    const entity = await this.findOne(id, userId, canViewAll);
    this.assertCanManage(entity, userId, canViewAll);
    this.assertTransition(entity.status, ContributionStatus.PAUSED);
    await this.repo.update(id, { status: ContributionStatus.PAUSED });
    return this.findOne(id, userId, canViewAll);
  }

  async complete(
    id: string,
    userId: string,
    canViewAll: boolean,
  ): Promise<Contribution> {
    const entity = await this.findOne(id, userId, canViewAll);
    this.assertCanManage(entity, userId, canViewAll);
    this.assertTransition(entity.status, ContributionStatus.COMPLETED);

    const openCount = await this.obligationsRepo.count({
      where: [
        { contribution_id: id, status: ContributionObligationStatus.PENDING },
        { contribution_id: id, status: ContributionObligationStatus.PARTIAL },
      ],
    });
    if (openCount > 0) {
      throw new AppError('CONTRIBUTION_PENDING_OBLIGATIONS');
    }

    await this.repo.update(id, {
      status: ContributionStatus.COMPLETED,
      completed_at: new Date(),
    });
    return this.findOne(id, userId, canViewAll);
  }

  async cancel(
    id: string,
    dto: CancelContributionDto,
    userId: string,
    canViewAll: boolean,
  ): Promise<Contribution> {
    const entity = await this.findOne(id, userId, canViewAll);
    this.assertCanManage(entity, userId, canViewAll);
    this.assertTransition(entity.status, ContributionStatus.CANCELLED);

    await this.repo.update(id, {
      status: ContributionStatus.CANCELLED,
      cancelled_at: new Date(),
      cancel_reason: dto.reason ?? null,
    });
    return this.findOne(id, userId, canViewAll);
  }

  // ---------------------------------------------------------------------
  // Obligations
  // ---------------------------------------------------------------------

  /**
   * Adds members to the campaign. Members already included are skipped (the
   * unique (contribution, member) constraint is the source of truth), so the
   * operation is safe to replay. Amount is frozen per member at inclusion time.
   */
  async addMembers(
    id: string,
    dto: AddMembersDto,
    userId: string,
    canViewAll: boolean,
  ): Promise<{ added: number; skipped: number }> {
    const contribution = await this.findOne(id, userId, canViewAll);
    this.assertCanManage(contribution, userId, canViewAll);

    if (
      contribution.status === ContributionStatus.COMPLETED ||
      contribution.status === ContributionStatus.CANCELLED
    ) {
      throw new AppError('CONTRIBUTION_MEMBERS_NOT_ADDABLE');
    }

    const exclude = new Set(dto.excludeMemberIds ?? []);
    let memberIds: string[];

    if (dto.allActive) {
      const all = await this.membersRepo.find({
        select: ['id'],
        order: { last_name: 'ASC', first_name: 'ASC' },
      });
      memberIds = all.map((m) => m.id);
    } else {
      memberIds = dto.memberIds ?? [];
    }
    memberIds = memberIds.filter((m) => !exclude.has(m));

    if (memberIds.length === 0) {
      throw new AppError('CONTRIBUTION_SELECT_MEMBERS');
    }

    const uniqueIds = [...new Set(memberIds)];
    const found = await this.membersRepo.find({
      where: { id: In(uniqueIds) },
      select: ['id'],
    });
    if (found.length !== uniqueIds.length) {
      throw new AppError('CONTRIBUTION_MEMBERS_NOT_FOUND');
    }

    const existing = await this.obligationsRepo.find({
      where: { contribution_id: id, member_id: In(uniqueIds) },
      select: ['member_id'],
    });
    const alreadyIncluded = new Set(existing.map((o) => o.member_id));
    const toCreate = uniqueIds.filter((m) => !alreadyIncluded.has(m));

    if (toCreate.length === 0) {
      return { added: 0, skipped: uniqueIds.length };
    }

    const amount = parseFloat(contribution.amount_per_member).toFixed(2);
    const rows = toCreate.map((memberId) =>
      this.obligationsRepo.create({
        contribution_id: id,
        member_id: memberId,
        amount,
        status: ContributionObligationStatus.PENDING,
        created_by: userId,
      }),
    );
    await this.obligationsRepo.save(rows);

    return { added: rows.length, skipped: uniqueIds.length - rows.length };
  }

  async listObligations(
    id: string,
    pagination: PaginationDto,
    userId: string,
    canViewAll: boolean,
    filters: Partial<FilterObligationsDto> = {},
  ): Promise<PaginatedResult<ContributionObligation>> {
    await this.findOne(id, userId, canViewAll);
    const { page, limit, sortBy, sortOrder } = pagination;

    const qb = this.obligationsRepo
      .createQueryBuilder('o')
      .leftJoinAndSelect('o.member', 'member')
      .andWhere('o.contribution_id = :id', { id })
      // Obligations survive a member's logical deletion: keep the name.
      .withDeleted();

    if (filters.status) {
      qb.andWhere('o.status = :status', { status: filters.status });
    }
    if (filters.search) {
      qb.andWhere(
        '(member.first_name ILIKE :search OR member.last_name ILIKE :search OR member.ci ILIKE :search)',
        { search: `%${filters.search}%` },
      );
    }

    const sortColumns = buildOrder(sortBy, sortOrder, OBLIGATION_SORT_COLUMNS);
    if (sortColumns.length > 0) {
      sortColumns.forEach(({ column, dir }, index) => {
        if (index === 0) qb.orderBy(column, dir);
        else qb.addOrderBy(column, dir);
      });
    } else {
      qb.orderBy('member.last_name', 'ASC').addOrderBy(
        'member.first_name',
        'ASC',
      );
    }

    const [items, total] = await qb
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

  async exonerate(
    contributionId: string,
    obligationId: string,
    dto: ExonerateObligationDto,
    userId: string,
    canViewAll: boolean,
  ): Promise<ContributionObligation> {
    const contribution = await this.findOne(contributionId, userId, canViewAll);
    this.assertCanManage(contribution, userId, canViewAll);

    const obligation = await this.findObligation(contributionId, obligationId);
    if (
      obligation.status === ContributionObligationStatus.EXONERATED ||
      obligation.status === ContributionObligationStatus.CANCELLED ||
      obligation.status === ContributionObligationStatus.PAID
    ) {
      throw new AppError('OBLIGATION_NOT_EXONERABLE');
    }

    obligation.status = ContributionObligationStatus.EXONERATED;
    obligation.exonerated_reason = dto.reason;
    obligation.exonerated_by = userId;
    obligation.exonerated_at = new Date();
    return this.obligationsRepo.save(obligation);
  }

  async cancelObligation(
    contributionId: string,
    obligationId: string,
    dto: CancelObligationDto,
    userId: string,
    canViewAll: boolean,
  ): Promise<ContributionObligation> {
    const contribution = await this.findOne(contributionId, userId, canViewAll);
    this.assertCanManage(contribution, userId, canViewAll);

    const obligation = await this.findObligation(contributionId, obligationId);
    if (obligation.status === ContributionObligationStatus.CANCELLED) {
      throw new AppError('OBLIGATION_ALREADY_CANCELLED');
    }
    if (obligation.status === ContributionObligationStatus.PAID) {
      throw new AppError('OBLIGATION_PAID_CANNOT_CANCEL');
    }
    if (
      obligation.status === ContributionObligationStatus.PARTIAL ||
      obligation.status === ContributionObligationStatus.EXONERATED
    ) {
      throw new AppError('OBLIGATION_HAS_PAYMENTS');
    }

    obligation.status = ContributionObligationStatus.CANCELLED;
    obligation.cancel_reason = dto.reason ?? null;
    return this.obligationsRepo.save(obligation);
  }

  private async findObligation(
    contributionId: string,
    obligationId: string,
  ): Promise<ContributionObligation> {
    const obligation = await this.obligationsRepo.findOne({
      where: { id: obligationId, contribution_id: contributionId },
      relations: ['member'],
      withDeleted: true,
    });
    if (!obligation) throw new AppError('OBLIGATION_NOT_FOUND');
    return obligation;
  }

  // ---------------------------------------------------------------------
  // Payments
  // ---------------------------------------------------------------------

  async listPayments(
    id: string,
    pagination: PaginationDto,
    userId: string,
    canViewAll: boolean,
    status?: ContributionPaymentStatus,
  ): Promise<PaginatedResult<ContributionPayment>> {
    await this.findOne(id, userId, canViewAll);
    const { page, limit, sortOrder } = pagination;

    const qb = this.paymentsRepo
      .createQueryBuilder('p')
      .leftJoinAndSelect('p.member', 'member')
      .leftJoinAndSelect('p.collectorUser', 'collectorUser')
      .leftJoinAndSelect('p.registeredByUser', 'registeredByUser')
      .andWhere('p.contribution_id = :id', { id })
      // Historical payments keep the member name after a logical deletion.
      .withDeleted();

    if (status) {
      qb.andWhere('p.status = :status', { status });
    }

    qb.orderBy('p.paid_at', sortOrder === 'ASC' ? 'ASC' : 'DESC').addOrderBy(
      'p.created_at',
      'DESC',
    );

    const [items, total] = await qb
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

  /**
   * Registers a (possibly partial) payment together with its ledger income
   * inside a single transaction:
   *
   * 1. validates the movement before writing anything,
   * 2. locks the obligation row (pessimistic) so concurrent payments serialize,
   * 3. checks the campaign can charge and the obligation is chargeable,
   * 4. rejects amounts above the pending balance (+ monetary tolerance),
   * 5. inserts the payment row, recomputes the derived obligation status,
   * 6. records the income with the transactional `EntityManager`.
   *
   * Any failure propagates and rolls the whole transaction back, so a payment
   * can never exist without its income and vice versa.
   */
  async pay(
    contributionId: string,
    dto: PayContributionDto,
    currentUserId: string,
  ): Promise<ContributionPayment> {
    const contribution = await this.repo.findOne({
      where: { id: contributionId },
      relations: ['responsibleUser', 'collectorUser'],
    });
    if (!contribution) throw new AppError('CONTRIBUTION_NOT_FOUND');
    if (contribution.status !== ContributionStatus.ACTIVE) {
      throw new AppError('CONTRIBUTION_NOT_COLLECTABLE');
    }
    await this.paymentMethodsService.validateCode(dto.paymentMethod);

    const evidence = await this.uploadEvidence(
      dto.evidenceBase64,
      dto.evidenceFileName,
    );

    const paidAt = new Date().toISOString().split('T')[0];
    const collectorUserId =
      dto.collectorUserId ?? contribution.collector_user_id ?? currentUserId;

    const created = await this.dataSource.transaction(async (manager) => {
      const obligations = manager.getRepository(ContributionObligation);
      const payments = manager.getRepository(ContributionPayment);

      const obligation = await obligations.findOne({
        where: { id: dto.obligationId, contribution_id: contributionId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!obligation) throw new AppError('OBLIGATION_NOT_FOUND');

      if (obligation.status === ContributionObligationStatus.EXONERATED) {
        throw new AppError('OBLIGATION_EXONERATED');
      }
      if (obligation.status === ContributionObligationStatus.CANCELLED) {
        throw new AppError('OBLIGATION_CANCELLED');
      }

      const paidSumRow = await payments
        .createQueryBuilder('p')
        .select('COALESCE(SUM(p.amount), 0)', 'total')
        .where('p.obligation_id = :id', { id: obligation.id })
        .andWhere('p.status = :status', {
          status: ContributionPaymentStatus.ACTIVE,
        })
        .getRawOne<{ total: string }>();
      const alreadyPaid = parseFloat(paidSumRow?.total ?? '0');
      const owed = parseFloat(obligation.amount);

      if (alreadyPaid + dto.amount > owed + MONEY_TOLERANCE) {
        throw new AppError('OBLIGATION_EXCEEDS_BALANCE', {
          balance: Math.max(0, owed - alreadyPaid).toFixed(2),
        });
      }

      const movement = {
        sourceType: FinanceSourceType.CONTRIBUTION_PAYMENT as const,
        sourceId: 'pending',
        amount: dto.amount,
        concept: `Aporte extraordinario - ${contribution.title}`,
        date: paidAt,
        memberId: obligation.member_id,
        contributionId: contribution.id,
        paymentMethod: dto.paymentMethod,
        reference: dto.reference,
        notes: dto.notes,
        responsibleUserId: contribution.responsible_user_id,
        collectorUserId,
        registeredByUserId: currentUserId,
      };
      await this.financesService.validateMovement(movement, manager);

      const payment = payments.create({
        obligation_id: obligation.id,
        contribution_id: contribution.id,
        member_id: obligation.member_id,
        amount: dto.amount.toFixed(2),
        payment_method: dto.paymentMethod ?? null,
        reference: dto.reference ?? null,
        notes: dto.notes ?? null,
        evidence_key: evidence ?? null,
        collector_user_id: collectorUserId,
        registered_by_user_id: currentUserId,
        paid_at: paidAt,
        status: ContributionPaymentStatus.ACTIVE,
      });
      const saved = await payments.save(payment);

      const totalPaid = alreadyPaid + dto.amount;
      const nextStatus =
        totalPaid >= owed - MONEY_TOLERANCE
          ? ContributionObligationStatus.PAID
          : ContributionObligationStatus.PARTIAL;

      // Conditional update: only terminal states are protected, so a
      // concurrent exonerate/cancel cannot be silently reverted.
      const result = await obligations
        .createQueryBuilder()
        .update(ContributionObligation)
        .set({
          status: nextStatus,
          paid_at:
            nextStatus === ContributionObligationStatus.PAID
              ? new Date()
              : obligation.paid_at,
        })
        .where('id = :id', { id: obligation.id })
        .andWhere('status IN (:...open)', {
          open: [
            ContributionObligationStatus.PENDING,
            ContributionObligationStatus.PARTIAL,
          ],
        })
        .execute();
      if ((result.affected ?? 0) === 0) {
        throw new AppError('OBLIGATION_STATE_CHANGED');
      }

      // Inside the transaction the income failure propagates and rolls the
      // payment row back with it.
      await this.financesService.recordIncome(
        { ...movement, sourceId: saved.id },
        undefined,
        manager,
      );

      return saved;
    });

    // Notifications run after commit: a WhatsApp/PDF failure must never
    // revert an already confirmed payment.
    if (created.member_id) {
      const member = await this.membersRepo.findOne({
        where: { id: created.member_id },
      });
      if (member?.phone) {
        setImmediate(() => {
          this.eventEmitter.emit('contribution.payment.created', {
            paymentId: created.id,
            phone: member.phone,
            phone_country: member.phone_country,
            filename: `comprobante-aporte-${paidAt}.pdf`,
          });
        });
      }
    }

    return created;
  }

  /**
   * Symmetric void: marks the payment voided and voids its ledger income in the
   * same transaction, then recomputes the obligation. History is preserved —
   * nothing is ever deleted.
   */
  async voidPayment(
    contributionId: string,
    paymentId: string,
    dto: VoidContributionPaymentDto,
    currentUserId: string,
    canViewAll: boolean,
  ): Promise<ContributionPayment> {
    const contribution = await this.findOne(
      contributionId,
      currentUserId,
      canViewAll,
    );
    if (!contribution) throw new AppError('CONTRIBUTION_NOT_FOUND');

    return this.dataSource.transaction(async (manager) => {
      const payments = manager.getRepository(ContributionPayment);
      const obligations = manager.getRepository(ContributionObligation);

      const payment = await payments.findOne({
        where: { id: paymentId, contribution_id: contributionId },
        lock: { mode: 'pessimistic_write' },
      });
      if (!payment) throw new AppError('CONTRIBUTION_PAYMENT_NOT_FOUND');
      if (payment.status === ContributionPaymentStatus.VOIDED) {
        throw new AppError('CONTRIBUTION_PAYMENT_ALREADY_VOIDED');
      }

      const income = await manager.getRepository(FinanceTransaction).findOne({
        where: {
          source_type: FinanceSourceType.CONTRIBUTION_PAYMENT,
          source_id: payment.id,
        },
      });
      if (income) {
        await this.financesService.void(
          income.id,
          { reason: dto.reason },
          currentUserId,
          undefined,
          manager,
        );
      }

      payment.status = ContributionPaymentStatus.VOIDED;
      payment.voided_at = new Date();
      payment.voided_reason = dto.reason;
      payment.voided_by = currentUserId;
      await payments.save(payment);

      const obligation = await obligations.findOne({
        where: { id: payment.obligation_id },
      });
      if (obligation) {
        const remainingRow = await payments
          .createQueryBuilder('p')
          .select('COALESCE(SUM(p.amount), 0)', 'total')
          .where('p.obligation_id = :id', { id: obligation.id })
          .andWhere('p.status = :status', {
            status: ContributionPaymentStatus.ACTIVE,
          })
          .getRawOne<{ total: string }>();
        const remaining = parseFloat(remainingRow?.total ?? '0');
        const owed = parseFloat(obligation.amount);

        const nextStatus =
          remaining <= MONEY_TOLERANCE
            ? ContributionObligationStatus.PENDING
            : remaining >= owed - MONEY_TOLERANCE
              ? ContributionObligationStatus.PAID
              : ContributionObligationStatus.PARTIAL;

        obligation.status = nextStatus;
        obligation.paid_at =
          nextStatus === ContributionObligationStatus.PAID
            ? (obligation.paid_at ?? new Date())
            : null;
        await obligations.save(obligation);
      }

      return payment;
    });
  }

  private async uploadEvidence(
    evidenceBase64?: string,
    fileName?: string,
  ): Promise<string | undefined> {
    if (!evidenceBase64) return undefined;
    try {
      const stored = await this.storageService.uploadDocument(
        evidenceBase64,
        'contributions/evidence',
        fileName,
      );
      return stored?.file_key;
    } catch {
      // Storage internals must not leak into the API response.
      throw new AppError('CONTRIBUTION_EVIDENCE_UPLOAD_FAILED');
    }
  }

  // ---------------------------------------------------------------------
  // Reporting
  // ---------------------------------------------------------------------

  /**
   * Everything the rendición needs: obligation figures (expected, collected,
   * pending recovery, exonerated) plus the ledger income/expenses/balance of
   * the campaign. Both concepts are deliberately separate: "pending recovery"
   * is money still owed by members, "balance" is money already in hand minus
   * what has been spent.
   */
  async getSummary(
    id: string,
    userId?: string,
    canViewAll = false,
  ): Promise<ContributionSummary> {
    const contribution = await this.findOne(id, userId, canViewAll);

    const obligationRows = await this.obligationsRepo
      .createQueryBuilder('o')
      .select('o.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .addSelect('COALESCE(SUM(o.amount), 0)', 'amount')
      .where('o.contribution_id = :id', { id })
      .groupBy('o.status')
      .getRawMany<{
        status: ContributionObligationStatus;
        count: string;
        amount: string;
      }>();

    const counts: Record<ContributionObligationStatus, number> = {
      [ContributionObligationStatus.PENDING]: 0,
      [ContributionObligationStatus.PARTIAL]: 0,
      [ContributionObligationStatus.PAID]: 0,
      [ContributionObligationStatus.EXONERATED]: 0,
      [ContributionObligationStatus.CANCELLED]: 0,
    };
    let expectedAmount = 0;
    let exoneratedAmount = 0;

    for (const row of obligationRows) {
      const count = parseInt(row.count, 10);
      const amount = parseFloat(row.amount || '0');
      counts[row.status] = count;
      if (row.status === ContributionObligationStatus.CANCELLED) continue;
      expectedAmount += amount;
      if (row.status === ContributionObligationStatus.EXONERATED) {
        exoneratedAmount += amount;
      }
    }

    const collectedRow = await this.paymentsRepo
      .createQueryBuilder('p')
      .select('COALESCE(SUM(p.amount), 0)', 'total')
      .where('p.contribution_id = :id', { id })
      .andWhere('p.status = :status', {
        status: ContributionPaymentStatus.ACTIVE,
      })
      .getRawOne<{ total: string }>();
    const collectedAmount = parseFloat(collectedRow?.total ?? '0');

    const pendingRecoveryAmount = Math.max(
      0,
      Number((expectedAmount - exoneratedAmount - collectedAmount).toFixed(2)),
    );

    const financeRows = await this.dataSource
      .getRepository(FinanceTransaction)
      .createQueryBuilder('tx')
      .select('tx.type', 'type')
      .addSelect('COALESCE(SUM(tx.amount), 0)', 'amount')
      .where('tx.contribution_id = :id', { id })
      .andWhere('tx.status = :status', { status: 'active' })
      .groupBy('tx.type')
      .getRawMany<{ type: FinanceTransactionType; amount: string }>();

    const finance = { income: 0, expenses: 0, balance: 0 };
    for (const row of financeRows) {
      const amount = parseFloat(row.amount || '0');
      if (row.type === FinanceTransactionType.INCOME) finance.income += amount;
      else finance.expenses += amount;
    }
    finance.balance = Number((finance.income - finance.expenses).toFixed(2));

    return {
      contribution,
      obligations: {
        total: Object.values(counts).reduce((sum, n) => sum + n, 0),
        pending: counts[ContributionObligationStatus.PENDING],
        partial: counts[ContributionObligationStatus.PARTIAL],
        paid: counts[ContributionObligationStatus.PAID],
        exonerated: counts[ContributionObligationStatus.EXONERATED],
        cancelled: counts[ContributionObligationStatus.CANCELLED],
        expectedAmount: Number(expectedAmount.toFixed(2)),
        exoneratedAmount: Number(exoneratedAmount.toFixed(2)),
        collectedAmount: Number(collectedAmount.toFixed(2)),
        pendingRecoveryAmount,
      },
      finance,
    };
  }

  /**
   * Ledger movements of this campaign, always scope-filtered by the finance
   * access context of the caller (so `finances.all` remains visibility-only).
   */
  async listFinances(
    contributionId: string,
    filter: FilterFinanceDto,
    userId: string,
    canViewAll: boolean,
    access: FinanceAccess,
  ) {
    await this.findOne(contributionId, userId, canViewAll);
    return this.financesService.findAll({ ...filter, contributionId }, access);
  }

  /** Payment evidences + ledger documents linked to the campaign. */
  async listDocuments(
    id: string,
    userId: string,
    canViewAll: boolean,
  ): Promise<{
    paymentEvidence: Array<{
      paymentId: string;
      fileKey: string;
      url: string;
      paidAt: string;
      memberName: string | null;
    }>;
    financeDocuments: FinanceDocument[];
  }> {
    await this.findOne(id, userId, canViewAll);

    const payments = await this.paymentsRepo
      .createQueryBuilder('p')
      .leftJoinAndSelect('p.member', 'member')
      .leftJoinAndSelect('p.obligation', 'obligation')
      .where('p.contribution_id = :id', { id })
      .andWhere('p.evidence_key IS NOT NULL')
      .andWhere('p.status = :status', {
        status: ContributionPaymentStatus.ACTIVE,
      })
      .orderBy('p.paid_at', 'DESC')
      // Payment evidences keep the member name after a logical deletion.
      .withDeleted()
      .getMany();

    const financeDocuments = await this.financeDocumentsRepo
      .createQueryBuilder('d')
      .innerJoin('d.transaction', 'tx')
      .where('tx.contribution_id = :id', { id })
      .orderBy('d.created_at', 'DESC')
      .getMany();

    return {
      paymentEvidence: payments.map((p) => ({
        paymentId: p.id,
        fileKey: p.evidence_key as string,
        url: this.storageService.getPublicUrl(p.evidence_key as string),
        paidAt: p.paid_at,
        memberName: p.member
          ? `${p.member.first_name} ${p.member.last_name}`
          : null,
      })),
      financeDocuments,
    };
  }
}
