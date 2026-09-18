import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { AuditLog, AuditAction } from './entities/audit-log.entity';
import { FilterAuditDto } from './dto/filter-audit.dto';
import {
  PaginatedResult,
  PaginationDto,
} from '../../common/dto/pagination.dto';

interface AuditExportOptions {
  entity?: string;
  action?: AuditAction;
  userId?: string;
  entityId?: string;
  dateFrom?: string;
  dateTo?: string;
}

@Injectable()
export class AuditService {
  constructor(
    @InjectRepository(AuditLog)
    private readonly auditLogRepository: Repository<AuditLog>,
  ) {}

  private applyFilters(
    qb: SelectQueryBuilder<AuditLog>,
    opts: {
      entity?: string;
      action?: AuditAction;
      userId?: string;
      entityId?: string;
      dateFrom?: string;
      dateTo?: string;
    },
  ): void {
    if (opts.entity) {
      qb.andWhere('audit.entity = :entity', { entity: opts.entity });
    }
    if (opts.action) {
      qb.andWhere('audit.action = :action', { action: opts.action });
    }
    if (opts.userId) {
      qb.andWhere('audit.user_id = :userId', { userId: opts.userId });
    }
    if (opts.entityId) {
      qb.andWhere('audit.entity_id = :entityId', { entityId: opts.entityId });
    }
    if (opts.dateFrom) {
      qb.andWhere('audit.created_at >= :dateFrom', {
        dateFrom: new Date(opts.dateFrom),
      });
    }
    if (opts.dateTo) {
      const endOfDay = new Date(opts.dateTo);
      endOfDay.setHours(23, 59, 59, 999);
      qb.andWhere('audit.created_at <= :dateTo', { dateTo: endOfDay });
    }
  }

  async findAll(filter: FilterAuditDto): Promise<PaginatedResult<AuditLog>> {
    const { page, limit, sortBy, sortOrder, ...rest } = filter;

    const qb = this.auditLogRepository
      .createQueryBuilder('audit')
      .leftJoinAndSelect('audit.user', 'user');

    this.applyFilters(qb, rest);

    const sortableColumns: Record<string, string> = {
      created_at: 'audit.created_at',
      action: 'audit.action',
      entity: 'audit.entity',
      user_id: 'audit.user_id',
    };

    const sortColumn = sortBy && sortableColumns[sortBy];
    if (sortColumn) {
      qb.orderBy(sortColumn, sortOrder === 'DESC' ? 'DESC' : 'ASC');
    } else {
      qb.orderBy('audit.created_at', 'DESC');
    }

    const [items, total] = await qb
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    items.forEach((item) => {
      if (item.user) {
        delete (item.user as any).password_hash;
      }
    });

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async logAction(options: {
    action: AuditAction;
    entity: string;
    entityId: string;
    oldValues?: Record<string, unknown> | null;
    newValues?: Record<string, unknown> | null;
    userId?: string | null;
    ipAddress?: string | null;
    userAgent?: string | null;
  }): Promise<void> {
    await this.auditLogRepository.insert({
      user_id: options.userId ?? null,
      action: options.action,
      entity: options.entity,
      entity_id: options.entityId,
      old_values: options.oldValues ?? null,
      new_values: options.newValues ?? null,
      ip_address: options.ipAddress ?? null,
      user_agent: options.userAgent ?? null,
    } as any);
  }

  async exportToCsv(options: AuditExportOptions): Promise<string> {
    const qb = this.auditLogRepository
      .createQueryBuilder('audit')
      .leftJoin('audit.user', 'user')
      .addSelect('user.email', 'user_email')
      .addSelect('user.full_name', 'user_full_name');

    this.applyFilters(qb, options);

    qb.orderBy('audit.created_at', 'DESC');

    const rows = await qb.getRawMany();

    const headers = [
      'Date',
      'Action',
      'Entity',
      'Entity ID',
      'User ID',
      'User Email',
      'User Name',
      'IP Address',
      'User Agent',
      'Old Values',
      'New Values',
    ];

    const escapeCsv = (value: unknown): string => {
      if (value == null) return '';
      let str = String(value);
      str = str.replace(/"/g, '""');
      return `"${str}"`;
    };

    const lines: string[] = [headers.join(',')];
    for (const row of rows) {
      const line = [
        escapeCsv(row.audit_created_at),
        escapeCsv(row.audit_action),
        escapeCsv(row.audit_entity),
        escapeCsv(row.audit_entity_id),
        escapeCsv(row.audit_user_id),
        escapeCsv(row.user_email),
        escapeCsv(row.user_full_name),
        escapeCsv(row.audit_ip_address),
        escapeCsv(row.audit_user_agent),
        escapeCsv(row.audit_old_values),
        escapeCsv(row.audit_new_values),
      ];
      lines.push(line.join(','));
    }

    return lines.join('\n');
  }

  async cleanup(retentionDays: number): Promise<number> {
    if (retentionDays <= 0) return 0;
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - retentionDays);
    const result = await this.auditLogRepository
      .createQueryBuilder()
      .delete()
      .where('created_at < :cutoff', { cutoff })
      .execute();
    return result.affected ?? 0;
  }
}
