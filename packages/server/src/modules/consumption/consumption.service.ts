import { Inject, Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  PaginatedResult,
  PaginationDto,
} from '../../common/dto/pagination.dto';
import { buildOrder } from '../../common/utils/sort';
import { applyTokenizedSearch } from '../../common/utils/search';
import { Meter } from '../meters/entities/meter.entity';
import { CreateConsumptionDto } from './dto/consumption.dto';
import { Consumption } from './entities/consumption.entity';
import { StorageService } from './storage.service';
import { AppError } from '../../common/errors/app-error';

@Injectable()
export class ConsumptionService {
  private readonly logger = new Logger(ConsumptionService.name);

  constructor(
    @InjectRepository(Consumption)
    private readonly consumptionsRepository: Repository<Consumption>,
    @InjectRepository(Meter)
    private readonly metersRepository: Repository<Meter>,
    @Inject()
    private readonly storageService: StorageService,
  ) {}

  async findAll(
    pagination: PaginationDto,
    filters: {
      month?: number;
      year?: number;
      meterId?: string;
      search?: string;
    } = {},
  ): Promise<PaginatedResult<Consumption>> {
    const { page, limit, sortBy, sortOrder } = pagination;
    const query = this.consumptionsRepository
      .createQueryBuilder('consumption')
      .leftJoinAndSelect('consumption.meter', 'meter')
      .leftJoinAndSelect('meter.member', 'member')
      .leftJoinAndSelect('consumption.payments', 'payment')
      // Historical consumptions keep the member name even if it was logically
      // deleted afterwards.
      .withDeleted();

    if (filters.month) {
      query.andWhere('consumption.month = :month', { month: filters.month });
    }
    if (filters.year) {
      query.andWhere('consumption.year = :year', { year: filters.year });
    }
    if (filters.meterId) {
      query.andWhere('consumption.meter_id = :meterId', {
        meterId: filters.meterId,
      });
    }
    // Multi-word, accent-insensitive search across the meter code and the
    // member's name/CI (the table shows the member name). Tokens are ANDed so
    // "juan martinez" matches across first_name and last_name.
    applyTokenizedSearch(query, filters.search, [
      'meter.code',
      'member.first_name',
      'member.last_name',
      'member.ci',
    ]);

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

  async findHistoryByMeter(meterId: string): Promise<Consumption[]> {
    return this.consumptionsRepository.find({
      where: { meter_id: meterId },
      order: { year: 'DESC', month: 'DESC' },
    });
  }

  async findOne(id: string): Promise<Consumption> {
    const consumption = await this.consumptionsRepository.findOne({
      where: { id },
      relations: ['meter', 'meter.member'],
      withDeleted: true,
    });
    if (!consumption) {
      throw new AppError('CONSUMPTION_NOT_FOUND');
    }
    return consumption;
  }

  async create(dto: CreateConsumptionDto): Promise<Consumption> {
    const meter = await this.metersRepository.findOne({
      where: { id: dto.meterId },
    });
    if (!meter) {
      throw new AppError('METER_NOT_FOUND');
    }

    // Handle image upload using StorageService
    const imageKey = await this.storageService.uploadOptimizedImage(
      dto.imageBase64,
      'consumptions',
    );

    const existing = await this.consumptionsRepository.findOne({
      where: {
        meter_id: dto.meterId,
        month: dto.month,
        year: dto.year,
      },
    });
    if (existing) {
      throw new AppError('CONSUMPTION_EXISTS');
    }

    const lastReading = await this.consumptionsRepository.findOne({
      where: { meter_id: dto.meterId },
      order: { year: 'DESC', month: 'DESC' },
    });
    const previous = lastReading
      ? parseFloat(lastReading.current_reading)
      : meter.initial_reading != null
        ? parseFloat(meter.initial_reading)
        : 0;
    const current = dto.currentReading;

    if (current < previous) {
      throw new AppError('CURRENT_READING_LOWER');
    }

    const consumption = this.consumptionsRepository.create({
      meter_id: dto.meterId,
      month: dto.month,
      year: dto.year,
      current_reading: current.toString(),
      previous_reading: previous.toString(),
      cubic_meters: (current - previous).toString(),
      image_key: imageKey,
    });
    return this.consumptionsRepository.save(consumption);
  }

  async remove(id: string): Promise<void> {
    const consumption = await this.consumptionsRepository.findOne({
      where: { id },
      relations: ['payments'],
    });
    if (!consumption) {
      throw new AppError('CONSUMPTION_NOT_FOUND');
    }

    if (consumption.payments?.length) {
      throw new AppError('CONSUMPTION_HAS_BILL');
    }

    if (consumption.image_key) {
      try {
        await this.storageService.delete(consumption.image_key);
      } catch (err) {
        this.logger.error(
          'Error deleting consumption image',
          (err as Error)?.stack,
        );
      }
    }

    await this.consumptionsRepository.remove(consumption);
  }
}

const SORT_COLUMNS: Record<string, string | string[]> = {
  year: 'consumption.year',
  month: 'consumption.month',
  period: ['consumption.year', 'consumption.month'],
  previous_reading: 'consumption.previous_reading',
  current_reading: 'consumption.current_reading',
  cubic_meters: 'consumption.cubic_meters',
  meter: 'meter.code',
  created_at: 'consumption.created_at',
};
