import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
  DataSource,
  EntityManager,
  In,
  Repository,
  SelectQueryBuilder,
} from 'typeorm';
import {
  PaginatedResult,
  PaginationDto,
} from '../../common/dto/pagination.dto';
import { buildOrder } from '../../common/utils/sort';
import { Fine, FineStatus } from './entities/fine.entity';
import { PayFineDto, CancelFineDto } from './dto/fine.dto';
import { FinancesService } from '../finances/finances.service';
import { FinanceSourceType } from '../finances/entities/finance-transaction.entity';

const SORT_COLUMNS: Record<string, string> = {
  member: 'member.first_name',
  activity: 'activity.name',
  type: 'fineType.name',
  amount: 'f.amount',
  status: 'f.status',
  created_at: 'f.created_at',
};

@Injectable()
export class FinesService {
  private readonly logger = new Logger(FinesService.name);

  constructor(
    @InjectRepository(Fine)
    private readonly repo: Repository<Fine>,
    private readonly eventEmitter: EventEmitter2,
    private readonly financesService: FinancesService,
    private readonly dataSource: DataSource,
  ) {}

  private applyUserScope(
    query: SelectQueryBuilder<Fine>,
    userId: string,
    canViewAll: boolean,
  ): void {
    if (canViewAll) return;
    query.andWhere(
      'f.activity_id IN (SELECT a.id FROM activities a LEFT JOIN activity_shares s ON s.activity_id = a.id WHERE a.created_by = :userId OR s.user_id = :userId)',
      { userId },
    );
  }

  async findAll(
    filters: {
      memberId?: string;
      status?: FineStatus;
      search?: string;
      activityId?: string;
    } = {},
    userId?: string,
    canViewAll = true,
  ): Promise<Fine[]> {
    const query = this.repo
      .createQueryBuilder('f')
      .leftJoinAndSelect('f.member', 'member')
      .leftJoinAndSelect('f.activity', 'activity')
      .leftJoinAndSelect('f.fineType', 'fineType');

    if (filters.memberId) {
      query.andWhere('f.member_id = :memberId', { memberId: filters.memberId });
    }
    if (filters.status) {
      query.andWhere('f.status = :status', { status: filters.status });
    }
    if (filters.search) {
      query.andWhere(
        '(member.first_name ILIKE :search OR member.last_name ILIKE :search)',
        { search: `%${filters.search}%` },
      );
    }
    if (filters.activityId) {
      query.andWhere('f.activity_id = :activityId', {
        activityId: filters.activityId,
      });
    }

    if (userId) {
      this.applyUserScope(query, userId, canViewAll);
    }

    query.orderBy('f.created_at', 'DESC');

    return query.getMany();
  }

  async findAllReport(
    pagination: PaginationDto,
    filters: {
      status?: string;
      search?: string;
      activityId?: string;
    } = {},
    userId?: string,
    canViewAll = true,
  ): Promise<PaginatedResult<Fine>> {
    const { page, limit, sortBy, sortOrder } = pagination;

    const query = this.repo
      .createQueryBuilder('f')
      .leftJoinAndSelect('f.member', 'member')
      .leftJoinAndSelect('f.activity', 'activity')
      .leftJoinAndSelect('f.fineType', 'fineType');

    if (filters.status) {
      query.andWhere('f.status = :status', { status: filters.status });
    }
    if (filters.search) {
      query.andWhere(
        '(member.first_name ILIKE :search OR member.last_name ILIKE :search)',
        { search: `%${filters.search}%` },
      );
    }
    if (filters.activityId) {
      query.andWhere('f.activity_id = :activityId', {
        activityId: filters.activityId,
      });
    }

    if (userId) {
      this.applyUserScope(query, userId, canViewAll);
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
      query.orderBy('f.created_at', 'DESC');
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

  async findByMember(
    memberId: string,
    userId?: string,
    canViewAll = true,
  ): Promise<Fine[]> {
    const query = this.repo
      .createQueryBuilder('f')
      .leftJoinAndSelect('f.activity', 'activity')
      .leftJoinAndSelect('f.fineType', 'fineType')
      .andWhere('f.member_id = :memberId', { memberId });

    if (userId) {
      this.applyUserScope(query, userId, canViewAll);
    }

    query.orderBy('f.created_at', 'DESC');

    return query.getMany();
  }

  async findOne(id: string): Promise<Fine> {
    const fine = await this.repo.findOne({
      where: { id },
      relations: ['member', 'activity', 'fineType'],
    });
    if (!fine) throw new NotFoundException('Multa no encontrada');
    return fine;
  }

  async pay(id: string, dto: PayFineDto): Promise<Fine> {
    await this.dataSource.transaction(async (manager) => {
      const repo = manager.getRepository(Fine);

      const current = await repo.findOne({
        where: { id },
        relations: ['member', 'activity', 'fineType'],
      });
      if (!current) throw new NotFoundException('Multa no encontrada');
      if (current.status === FineStatus.PAID) {
        throw new NotFoundException('La multa ya fue pagada');
      }
      if (current.status === FineStatus.CANCELLED) {
        throw new NotFoundException('La multa fue cancelada');
      }

      // Conditional update instead of a pessimistic lock: the WHERE clause makes
      // the PENDING -> PAID transition atomic and a concurrent payment simply
      // affects 0 rows. A row lock cannot be used here because the eager fineType
      // relation makes TypeORM emit an outer join, which Postgres refuses to lock.
      const result = await repo
        .createQueryBuilder()
        .update(Fine)
        .set({
          status: FineStatus.PAID,
          paid_at: new Date(),
          notes: dto.notes ?? current.notes,
        })
        .where('id = :id', { id })
        .andWhere('status = :status', { status: FineStatus.PENDING })
        .execute();

      if ((result.affected ?? 0) === 0) {
        throw new ConflictException(
          'La multa cambió de estado mientras se procesaba el pago',
        );
      }

      const updated = await repo.findOne({
        where: { id },
        relations: ['member', 'activity', 'fineType'],
      });
      if (!updated) throw new NotFoundException('Multa no encontrada');

      await this.recordFineIncome(updated, manager);

      return updated;
    });

    const paid = await this.findOne(id);
    const member = paid.member;
    if (member?.phone) {
      this.eventEmitter.emit('fine.paid', {
        fineId: paid.id,
        phone: member.phone,
        phone_country: member.phone_country,
        filename: `comprobante-multa-${new Date().toISOString().split('T')[0]}.pdf`,
      });
    }

    return paid;
  }

  async bulkPay(ids: string[], notes?: string): Promise<{ paid: number }> {
    const uniqueIds = [...new Set(ids)];
    if (uniqueIds.length === 0) return { paid: 0 };

    const values: Partial<Fine> = {
      status: FineStatus.PAID,
      paid_at: new Date(),
    };
    if (notes) values.notes = notes;

    const paidFines = await this.dataSource.transaction(async (manager) => {
      const repo = manager.getRepository(Fine);

      // RETURNING yields exactly the rows this call transitioned from PENDING to
      // PAID. A previous SELECT snapshot would still contain fines paid by a
      // concurrent request, which would notify those members about a payment that
      // this call did not process.
      const result = await repo
        .createQueryBuilder()
        .update(Fine)
        .set(values)
        .where('id IN (:...ids)', { ids: uniqueIds })
        .andWhere('status = :status', { status: FineStatus.PENDING })
        .returning('id')
        .execute();

      const paidIds: string[] = (result.raw ?? []).map(
        (row: { id: string }) => row.id,
      );
      if (paidIds.length === 0) return [];

      const updated = await repo.find({
        where: { id: In(paidIds) },
        relations: ['member', 'activity', 'fineType'],
      });

      for (const fine of updated) {
        await this.recordFineIncome(fine, manager);
      }

      return updated;
    });

    if (paidFines.length === 0) return { paid: 0 };

    const groups = new Map<string, Fine[]>();
    for (const fine of paidFines) {
      const key = fine.member?.phone
        ? `${fine.member_id}:${fine.member.phone_country ?? 'BO'}`
        : null;
      if (!key) continue;
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(fine);
    }

    for (const fines of groups.values()) {
      const member = fines[0].member;
      this.eventEmitter.emit('fines.paid.bulk', {
        fineIds: fines.map((f) => f.id),
        phone: member.phone,
        phone_country: member.phone_country,
        filename: `comprobante-multas-${new Date().toISOString().split('T')[0]}.pdf`,
      });
    }

    return { paid: paidFines.length };
  }

  /**
   * Pushes a paid fine into the financial ledger as automatic income.
   * Idempotent through the (sourceType, sourceId) pair, so paying the same
   * fine twice can never duplicate the movement.
   */
  private async recordFineIncome(
    fine: Fine,
    manager?: EntityManager,
  ): Promise<void> {
    const input = {
      sourceType: FinanceSourceType.FINE_PAYMENT,
      sourceId: fine.id,
      amount: parseFloat(fine.amount),
      concept: `Multa${fine.fineType?.name ? ` - ${fine.fineType.name}` : ''}${
        fine.activity?.name ? ` (${fine.activity.name})` : ''
      }`,
      date: fine.paid_at
        ? new Date(fine.paid_at).toISOString().split('T')[0]
        : undefined,
      memberId: fine.member_id,
      notes: fine.notes,
    };

    if (!manager) {
      await this.financesService.recordIncome(input);
      return;
    }

    await this.financesService.validateMovement(input, manager);
    await this.financesService.recordIncome(input, undefined, manager);
  }

  async cancel(id: string, dto: CancelFineDto): Promise<Fine> {
    const fine = await this.findOne(id);
    if (fine.status === FineStatus.CANCELLED) {
      throw new NotFoundException('La multa ya fue cancelada');
    }
    fine.status = FineStatus.CANCELLED;
    fine.notes = dto.reason ?? fine.notes;
    return this.repo.save(fine);
  }

  async getStats(
    filters: { memberId?: string } = {},
    userId?: string,
    canViewAll = true,
  ): Promise<{
    total: number;
    pending: number;
    paid: number;
    cancelled: number;
    totalAmount: string;
    pendingAmount: string;
  }> {
    const query = this.repo
      .createQueryBuilder('f')
      .select('f.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .addSelect('SUM(f.amount)', 'amount')
      .where('1=1');

    if (filters.memberId) {
      query.andWhere('f.member_id = :memberId', { memberId: filters.memberId });
    }

    if (userId) {
      this.applyUserScope(query, userId, canViewAll);
    }

    const rows = await query.groupBy('f.status').getRawMany();

    const stats = {
      total: 0,
      pending: 0,
      paid: 0,
      cancelled: 0,
      totalAmount: '0',
      pendingAmount: '0',
    };

    for (const row of rows) {
      const count = parseInt(row.count, 10);
      const amount = parseFloat(row.amount || '0');
      stats.total += count;
      switch (row.status) {
        case FineStatus.PENDING:
          stats.pending = count;
          stats.pendingAmount = amount.toFixed(2);
          break;
        case FineStatus.PAID:
          stats.paid = count;
          break;
        case FineStatus.CANCELLED:
          stats.cancelled = count;
          break;
      }
      stats.totalAmount = (parseFloat(stats.totalAmount) + amount).toFixed(2);
    }

    return stats;
  }
}
