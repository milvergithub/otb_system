import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { In, Repository, SelectQueryBuilder } from 'typeorm';
import {
  PaginatedResult,
  PaginationDto,
} from '../../common/dto/pagination.dto';
import { buildOrder } from '../../common/utils/sort';
import { Fine, FineStatus } from './entities/fine.entity';
import { PayFineDto, CancelFineDto } from './dto/fine.dto';

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
    const fine = await this.findOne(id);
    if (fine.status === FineStatus.PAID) {
      throw new NotFoundException('La multa ya fue pagada');
    }
    if (fine.status === FineStatus.CANCELLED) {
      throw new NotFoundException('La multa fue cancelada');
    }
    fine.status = FineStatus.PAID;
    fine.paid_at = new Date();
    fine.notes = dto.notes ?? fine.notes;
    const saved = await this.repo.save(fine);

    const member = saved.member;
    if (member?.phone) {
      this.eventEmitter.emit('fine.paid', {
        fineId: saved.id,
        phone: member.phone,
        phone_country: member.phone_country,
        filename: `comprobante-multa-${new Date().toISOString().split('T')[0]}.pdf`,
      });
    }

    return saved;
  }

  async bulkPay(ids: string[], notes?: string): Promise<{ paid: number }> {
    const pendingFines = await this.repo.find({
      where: {
        id: In(ids),
        status: FineStatus.PENDING,
      },
      relations: ['member', 'activity', 'fineType'],
    });

    const values: Partial<Fine> = {
      status: FineStatus.PAID,
      paid_at: new Date(),
    };
    if (notes) values.notes = notes;
    const result = await this.repo
      .createQueryBuilder()
      .update(Fine)
      .set(values)
      .where('id IN (:...ids)', { ids })
      .andWhere('status = :status', { status: FineStatus.PENDING })
      .execute();

    const paidCount = result.affected ?? 0;

    if (paidCount > 0 && pendingFines.length > 0) {
      const groups = new Map<string, Fine[]>();
      for (const fine of pendingFines) {
        const key = fine.member?.phone
          ? `${fine.member_id}:${fine.member.phone_country ?? 'BO'}`
          : null;
        if (!key) continue;
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key)!.push(fine);
      }

      for (const [key, fines] of groups) {
        const member = fines[0].member;
        this.eventEmitter.emit('fines.paid.bulk', {
          fineIds: fines.map((f) => f.id),
          phone: member.phone,
          phone_country: member.phone_country,
          filename: `comprobante-multas-${new Date().toISOString().split('T')[0]}.pdf`,
        });
      }
    }

    return { paid: paidCount };
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
