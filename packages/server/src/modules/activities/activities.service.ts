import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  PaginatedResult,
  PaginationDto,
} from '../../common/dto/pagination.dto';
import { buildOrder } from '../../common/utils/sort';
import { Activity } from './entities/activity.entity';
import { ActivityShare } from './entities/activity-share.entity';
import { CreateActivityDto, UpdateActivityDto } from './dto/activity.dto';

const SORT_COLUMNS: Record<string, string> = {
  name: 'a.name',
  date: 'a.date',
  created_at: 'a.created_at',
  start_time: 'a.start_time',
};

@Injectable()
export class ActivitiesService {
  constructor(
    @InjectRepository(Activity)
    private readonly repo: Repository<Activity>,
    @InjectRepository(ActivityShare)
    private readonly shareRepo: Repository<ActivityShare>,
  ) {}

  async findAll(
    pagination: PaginationDto,
    userId: string,
    canViewAll: boolean,
    search?: string,
  ): Promise<PaginatedResult<Activity>> {
    const { page, limit, sortBy, sortOrder } = pagination;

    const qb = this.repo
      .createQueryBuilder('a')
      .leftJoinAndSelect('a.creator', 'creator');

    if (!canViewAll) {
      qb.leftJoin('a.shares', 'share')
        .where('a.created_by = :userId', { userId })
        .orWhere('share.user_id = :userId', { userId });
    }

    if (search) {
      const whereClause = canViewAll ? 'WHERE' : 'AND';
      qb.andWhere(
        `${whereClause} (a.name ILIKE :search OR a.description ILIKE :search)`,
        { search: `%${search}%` },
      );
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
    if (canViewAll) {
      return this.repo.find({
        relations: ['creator'],
        order: { date: 'DESC', start_time: 'DESC' },
      });
    }
    return this.repo
      .createQueryBuilder('a')
      .leftJoinAndSelect('a.creator', 'creator')
      .leftJoin('a.shares', 'share')
      .where('a.created_by = :userId', { userId })
      .orWhere('share.user_id = :userId', { userId })
      .orderBy('a.date', 'DESC')
      .addOrderBy('a.start_time', 'DESC')
      .getMany();
  }

  async findOne(id: string): Promise<Activity> {
    const a = await this.repo.findOne({
      where: { id },
      relations: [
        'creator',
        'attendances',
        'attendances.member',
        'shares',
        'shares.user',
      ],
    });
    if (!a) throw new NotFoundException('Actividad no encontrada');
    return a;
  }

  async create(dto: CreateActivityDto, userId: string): Promise<Activity> {
    if (dto.startTime >= dto.endTime) {
      throw new BadRequestException(
        'La hora de fin debe ser posterior a la hora de inicio',
      );
    }

    const entity = this.repo.create({
      name: dto.name,
      description: dto.description,
      date: dto.date,
      start_time: dto.startTime,
      end_time: dto.endTime,
      created_by: userId,
    });
    return this.repo.save(entity);
  }

  async update(
    id: string,
    dto: UpdateActivityDto,
    userId: string,
    canViewAll: boolean,
  ): Promise<Activity> {
    const entity = await this.findOne(id);
    if (!canViewAll && entity.created_by !== userId) {
      throw new ForbiddenException(
        'Solo el creador puede editar esta actividad',
      );
    }

    if (dto.startTime && dto.endTime && dto.startTime >= dto.endTime) {
      throw new BadRequestException(
        'La hora de fin debe ser posterior a la hora de inicio',
      );
    }

    Object.assign(entity, {
      name: dto.name ?? entity.name,
      description: dto.description ?? entity.description,
      date: dto.date ?? entity.date,
      start_time: dto.startTime ?? entity.start_time,
      end_time: dto.endTime ?? entity.end_time,
    });
    return this.repo.save(entity);
  }

  async remove(id: string, userId: string, canViewAll: boolean): Promise<void> {
    const entity = await this.findOne(id);
    if (!canViewAll && entity.created_by !== userId) {
      throw new ForbiddenException(
        'Solo el creador puede eliminar esta actividad',
      );
    }
    await this.repo.remove(entity);
  }

  async share(
    activityId: string,
    targetUserId: string,
    permission: string,
  ): Promise<ActivityShare> {
    const activity = await this.findOne(activityId);
    const existing = await this.shareRepo.findOne({
      where: { activity_id: activityId, user_id: targetUserId },
    });
    if (existing) {
      throw new BadRequestException(
        'El usuario ya tiene acceso a esta actividad',
      );
    }
    const share = this.shareRepo.create({
      activity_id: activityId,
      user_id: targetUserId,
      permission,
    });
    return this.shareRepo.save(share);
  }

  async unshare(activityId: string, targetUserId: string): Promise<void> {
    const share = await this.shareRepo.findOne({
      where: { activity_id: activityId, user_id: targetUserId },
    });
    if (!share) throw new NotFoundException('Compartición no encontrada');
    await this.shareRepo.remove(share);
  }

  async getShares(activityId: string): Promise<ActivityShare[]> {
    return this.shareRepo.find({
      where: { activity_id: activityId },
      relations: ['user'],
    });
  }
}
