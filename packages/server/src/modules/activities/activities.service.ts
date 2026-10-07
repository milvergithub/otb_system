import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import {
  PaginatedResult,
  PaginationDto,
} from '../../common/dto/pagination.dto';
import { buildOrder } from '../../common/utils/sort';
import { Activity, ActivityStatus } from './entities/activity.entity';
import { ActivityType } from './entities/activity-type.entity';
import { ActivityAttendanceSession } from './entities/activity-attendance-session.entity';
import { ActivityEvidence } from './entities/activity-evidence.entity';
import { Attendance, AttendanceResult } from './entities/attendance.entity';
import { Fine, FineStatus } from './entities/fine.entity';
import {
  FinanceTransaction,
  FinanceTransactionType,
} from '../finances/entities/finance-transaction.entity';
import { User } from '../users/entities/user.entity';
import {
  CreateActivityDto,
  FilterActivitiesDto,
  UpdateActivityDto,
  UpdateActivityStatusDto,
} from './dto/activity.dto';

const SORT_COLUMNS: Record<string, string> = {
  name: 'a.name',
  date: 'a.date',
  created_at: 'a.created_at',
  start_time: 'a.start_time',
  status: 'a.status',
};

/** Allowed lifecycle transitions. Anything else is rejected. */
const ALLOWED_TRANSITIONS: Record<ActivityStatus, ActivityStatus[]> = {
  [ActivityStatus.DRAFT]: [ActivityStatus.SCHEDULED, ActivityStatus.CANCELLED],
  [ActivityStatus.SCHEDULED]: [
    ActivityStatus.IN_PROGRESS,
    ActivityStatus.CANCELLED,
  ],
  [ActivityStatus.IN_PROGRESS]: [
    ActivityStatus.COMPLETED,
    ActivityStatus.CANCELLED,
  ],
  [ActivityStatus.COMPLETED]: [],
  [ActivityStatus.CANCELLED]: [],
};

@Injectable()
export class ActivitiesService {
  constructor(
    @InjectRepository(Activity)
    private readonly repo: Repository<Activity>,
    @InjectRepository(ActivityType)
    private readonly activityTypeRepo: Repository<ActivityType>,
    @InjectRepository(User)
    private readonly usersRepo: Repository<User>,
    @InjectRepository(Attendance)
    private readonly attendanceRepo: Repository<Attendance>,
    @InjectRepository(Fine)
    private readonly fineRepo: Repository<Fine>,
    @InjectRepository(FinanceTransaction)
    private readonly transactionsRepo: Repository<FinanceTransaction>,
    @InjectRepository(ActivityEvidence)
    private readonly evidenceRepo: Repository<ActivityEvidence>,
    @InjectRepository(ActivityAttendanceSession)
    private readonly sessionRepo: Repository<ActivityAttendanceSession>,
  ) {}

  async findAll(
    pagination: PaginationDto,
    userId: string,
    canViewAll: boolean,
    search?: string,
    filters: FilterActivitiesDto = {},
  ): Promise<PaginatedResult<Activity>> {
    const { page, limit, sortBy, sortOrder } = pagination;

    const qb = this.repo
      .createQueryBuilder('a')
      .leftJoinAndSelect('a.creator', 'creator')
      .leftJoinAndSelect('a.type', 'type')
      .leftJoinAndSelect('a.responsibleUser', 'responsibleUser')
      .leftJoinAndSelect('a.collectorUser', 'collectorUser');

    if (!canViewAll) {
      qb.where('a.responsible_user_id = :userId', { userId });
    }

    if (search) {
      const searchCondition =
        '(a.name ILIKE :search OR a.description ILIKE :search OR a.location ILIKE :search)';
      if (canViewAll) {
        qb.where(searchCondition, { search: `%${search}%` });
      } else {
        qb.andWhere(searchCondition, { search: `%${search}%` });
      }
    }

    if (filters.status) {
      qb.andWhere('a.status = :status', { status: filters.status });
    }
    if (filters.typeId) {
      qb.andWhere('a.type_id = :typeId', { typeId: filters.typeId });
    }
    if (filters.responsibleUserId) {
      qb.andWhere('a.responsible_user_id = :responsibleUserId', {
        responsibleUserId: filters.responsibleUserId,
      });
    }
    if (filters.dateFrom) {
      qb.andWhere('a.date >= :dateFrom', { dateFrom: filters.dateFrom });
    }
    if (filters.dateTo) {
      qb.andWhere('a.date <= :dateTo', { dateTo: filters.dateTo });
    }

    const sortColumns = buildOrder(sortBy, sortOrder, SORT_COLUMNS);
    if (sortColumns.length > 0) {
      sortColumns.forEach(({ column, dir }, index) => {
        if (index === 0) {
          qb.orderBy(column, dir);
        } else {
          qb.addOrderBy(column, dir);
        }
      });
    } else {
      qb.orderBy('a.date', 'DESC').addOrderBy('a.start_time', 'DESC');
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

  async findAllSimple(
    userId: string,
    canViewAll: boolean,
  ): Promise<Activity[]> {
    const relations = ['creator', 'type', 'responsibleUser', 'collectorUser'];
    if (canViewAll) {
      return this.repo.find({
        relations,
        order: { date: 'DESC', start_time: 'DESC' },
      });
    }
    return this.repo
      .createQueryBuilder('a')
      .leftJoinAndSelect('a.creator', 'creator')
      .leftJoinAndSelect('a.type', 'type')
      .leftJoinAndSelect('a.responsibleUser', 'responsibleUser')
      .leftJoinAndSelect('a.collectorUser', 'collectorUser')
      .where('a.responsible_user_id = :userId', { userId })
      .orderBy('a.date', 'DESC')
      .addOrderBy('a.start_time', 'DESC')
      .getMany();
  }

  async findOne(id: string): Promise<Activity> {
    const a = await this.repo.findOne({
      where: { id },
      relations: [
        'creator',
        'type',
        'responsibleUser',
        'collectorUser',
        'attendances',
        'attendances.member',
      ],
    });
    if (!a) throw new NotFoundException('Actividad no encontrada');
    return a;
  }

  async create(dto: CreateActivityDto, userId: string): Promise<Activity> {
    this.validateTimes(dto.startTime, dto.endTime);
    await this.validateType(dto.typeId);
    await this.validateUserRef(dto.responsibleUserId, 'responsable');
    await this.validateUserRef(dto.collectorUserId, 'encargado de cobro');

    const entity = this.repo.create({
      name: dto.name,
      description: dto.description,
      date: dto.date,
      start_time: dto.startTime,
      end_time: dto.endTime,
      type_id: dto.typeId ?? null,
      location: dto.location ?? null,
      status: dto.status ?? ActivityStatus.SCHEDULED,
      responsible_user_id: dto.responsibleUserId ?? null,
      collector_user_id: dto.collectorUserId ?? null,
      attendance_required: dto.attendanceRequired ?? true,
      fine_enabled: dto.fineEnabled ?? true,
      created_by: userId,
    });
    const saved = await this.repo.save(entity);
    return this.findOne(saved.id);
  }

  async update(
    id: string,
    dto: UpdateActivityDto,
    userId: string,
    canViewAll: boolean,
  ): Promise<Activity> {
    const entity = await this.findOne(id);
    this.assertCanManage(entity, userId, canViewAll);

    if (dto.startTime && dto.endTime) {
      this.validateTimes(dto.startTime, dto.endTime);
    }
    if (dto.typeId !== undefined) await this.validateType(dto.typeId);
    if (dto.responsibleUserId !== undefined) {
      await this.validateUserRef(dto.responsibleUserId, 'responsable');
    }
    if (dto.collectorUserId !== undefined) {
      await this.validateUserRef(dto.collectorUserId, 'encargado de cobro');
    }
    if (dto.status !== undefined && dto.status !== entity.status) {
      this.assertTransition(entity.status, dto.status);
    }

    // Raw update instead of save(): the entity carries loaded user relations and
    // TypeORM would overwrite the changed FK columns with those stale objects.
    const patch: Partial<Activity> = {
      name: dto.name ?? entity.name,
      description: dto.description ?? entity.description,
      date: dto.date ?? entity.date,
      start_time: dto.startTime ?? entity.start_time,
      end_time: dto.endTime ?? entity.end_time,
      type_id: dto.typeId !== undefined ? dto.typeId : entity.type_id,
      location: dto.location !== undefined ? dto.location : entity.location,
      status: dto.status ?? entity.status,
      responsible_user_id:
        dto.responsibleUserId !== undefined
          ? dto.responsibleUserId
          : entity.responsible_user_id,
      collector_user_id:
        dto.collectorUserId !== undefined
          ? dto.collectorUserId
          : entity.collector_user_id,
      attendance_required: dto.attendanceRequired ?? entity.attendance_required,
      fine_enabled: dto.fineEnabled ?? entity.fine_enabled,
    };
    await this.repo.update(entity.id, patch);
    return this.findOne(id);
  }

  /**
   * Lifecycle transition. Completed and cancelled activities are terminal: they
   * preserve their history and can only be reopened through an explicit future
   * action, never by a generic status update.
   */
  async changeStatus(
    id: string,
    dto: UpdateActivityStatusDto,
    userId: string,
    canViewAll: boolean,
  ): Promise<Activity> {
    const entity = await this.findOne(id);
    this.assertCanManage(entity, userId, canViewAll);

    if (dto.status === entity.status) return entity;
    this.assertTransition(entity.status, dto.status);

    entity.status = dto.status;
    if (dto.status === ActivityStatus.CANCELLED && dto.reason) {
      entity.description = entity.description
        ? `${entity.description}\nCancelada: ${dto.reason}`
        : `Cancelada: ${dto.reason}`;
    }
    return this.repo.save(entity);
  }

  private assertTransition(from: ActivityStatus, to: ActivityStatus): void {
    const allowed = ALLOWED_TRANSITIONS[from] ?? [];
    if (!allowed.includes(to)) {
      throw new BadRequestException(
        `No se puede cambiar el estado de "${from}" a "${to}"`,
      );
    }
  }

  private assertCanManage(
    entity: Activity,
    userId: string,
    canViewAll: boolean,
  ): void {
    if (canViewAll) return;
    const isCreator = entity.created_by === userId;
    const isResponsible =
      entity.responsible_user_id !== null &&
      entity.responsible_user_id === userId;
    if (!isCreator && !isResponsible) {
      throw new ForbiddenException(
        'Solo el creador o el responsable puede modificar esta actividad',
      );
    }
  }

  private validateTimes(startTime: string, endTime: string): void {
    if (startTime >= endTime) {
      throw new BadRequestException(
        'La hora de fin debe ser posterior a la hora de inicio',
      );
    }
  }

  private async validateType(typeId?: string | null): Promise<void> {
    if (!typeId) return;
    const type = await this.activityTypeRepo.findOneBy({ id: typeId });
    if (!type) throw new BadRequestException('Tipo de actividad no encontrado');
  }

  private async validateUserRef(
    userId: string | null | undefined,
    label: string,
  ): Promise<void> {
    if (!userId) return;
    const user = await this.usersRepo.findOneBy({ id: userId });
    if (!user) throw new BadRequestException(`Usuario ${label} no encontrado`);
  }

  async remove(id: string, userId: string, canViewAll: boolean): Promise<void> {
    const entity = await this.findOne(id);
    this.assertCanManage(entity, userId, canViewAll);
    await this.repo.remove(entity);
  }

  async getSessions(activityId: string): Promise<ActivityAttendanceSession[]> {
    return this.sessionRepo.find({
      where: { activity_id: activityId },
      relations: ['startedBy', 'endedBy'],
      order: { created_at: 'DESC' },
    });
  }

  /**
   * Everything a rendición de cuentas needs for one activity, always derived
   * from the transactional sources (attendance, fines and the finance ledger)
   * instead of duplicated counters.
   */
  async getSummary(id: string) {
    const activity = await this.findOne(id);

    const attendanceRows = await this.attendanceRepo
      .createQueryBuilder('a')
      .select('a.result', 'result')
      .addSelect('a.present_at_start', 'presentAtStart')
      .addSelect('a.present_at_end', 'presentAtEnd')
      .addSelect('COUNT(*)', 'count')
      .where('a.activity_id = :id', { id })
      .groupBy('a.result')
      .addGroupBy('a.present_at_start')
      .addGroupBy('a.present_at_end')
      .getRawMany<{
        result: AttendanceResult | null;
        presentAtStart: boolean;
        presentAtEnd: boolean;
        count: string;
      }>();

    const attendance = {
      total: 0,
      present: 0,
      absent: 0,
      late: 0,
      leftEarly: 0,
      excused: 0,
      presentAtStart: 0,
      presentAtEnd: 0,
      attendanceRate: 0,
    };

    for (const row of attendanceRows) {
      const count = parseInt(row.count, 10);
      attendance.total += count;
      if (row.presentAtStart) attendance.presentAtStart += count;
      if (row.presentAtEnd) attendance.presentAtEnd += count;

      const result = row.result;
      if (!result) continue;
      switch (result) {
        case AttendanceResult.PRESENT:
          attendance.present += count;
          break;
        case AttendanceResult.ABSENT:
          attendance.absent += count;
          break;
        case AttendanceResult.LATE:
          attendance.late += count;
          break;
        case AttendanceResult.LEFT_EARLY:
          attendance.leftEarly += count;
          break;
        case AttendanceResult.EXCUSED:
          attendance.excused += count;
          break;
      }
    }
    attendance.attendanceRate =
      attendance.total > 0
        ? Number(
            (
              ((attendance.presentAtStart + attendance.presentAtEnd) /
                (attendance.total * 2)) *
              100
            ).toFixed(2),
          )
        : 0;

    const fineRows = await this.fineRepo
      .createQueryBuilder('f')
      .select('f.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .addSelect('COALESCE(SUM(f.amount), 0)', 'amount')
      .where('f.activity_id = :id', { id })
      .groupBy('f.status')
      .getRawMany<{ status: FineStatus; count: string; amount: string }>();

    const fines = {
      generated: 0,
      paid: 0,
      pending: 0,
      cancelled: 0,
      amountGenerated: 0,
      amountPaid: 0,
      amountPending: 0,
    };

    for (const row of fineRows) {
      const count = parseInt(row.count, 10);
      const amount = parseFloat(row.amount || '0');
      if (row.status === FineStatus.PAID) {
        fines.paid += count;
        fines.amountPaid += amount;
        continue;
      }
      fines.generated += count;
      if (row.status === FineStatus.PENDING) {
        fines.pending += count;
        fines.amountPending += amount;
      } else {
        fines.cancelled += count;
      }
      fines.amountGenerated += amount;
    }

    const financeRows = await this.transactionsRepo
      .createQueryBuilder('tx')
      .select('tx.type', 'type')
      .addSelect('COALESCE(SUM(tx.amount), 0)', 'amount')
      .where('tx.activity_id = :id', { id })
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

    const evidenceRows = await this.evidenceRepo
      .createQueryBuilder('e')
      .select('e.type', 'type')
      .addSelect('COUNT(*)', 'count')
      .where('e.activity_id = :id', { id })
      .groupBy('e.type')
      .getRawMany<{ type: string; count: string }>();

    const evidence = { total: 0, photos: 0, videos: 0, documents: 0 };
    for (const row of evidenceRows) {
      const count = parseInt(row.count, 10);
      evidence.total += count;
      if (row.type === 'photo') evidence.photos += count;
      else if (row.type === 'video') evidence.videos += count;
      else evidence.documents += count;
    }

    return {
      activity,
      attendance,
      fines,
      finance,
      evidence,
    };
  }

  async listTypes(): Promise<ActivityType[]> {
    return this.activityTypeRepo.find({ order: { name: 'ASC' } });
  }

  async listActiveTypes(): Promise<ActivityType[]> {
    return this.activityTypeRepo.find({
      where: { is_active: true },
      order: { name: 'ASC' },
    });
  }

  async findTypesByIds(ids: string[]): Promise<ActivityType[]> {
    if (ids.length === 0) return [];
    return this.activityTypeRepo.find({ where: { id: In(ids) } });
  }
}
