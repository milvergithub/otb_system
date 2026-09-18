import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateTariffDto, UpdateTariffDto } from './dto/tariff.dto';
import { Tariff } from './entities/tariff.entity';

@Injectable()
export class TariffsService {
  constructor(
    @InjectRepository(Tariff)
    private readonly tariffsRepository: Repository<Tariff>,
  ) {}

  async findAll(includeInactive = false): Promise<Tariff[]> {
    return this.tariffsRepository.find({
      where: includeInactive ? {} : { is_active: true },
      order: { valid_from: 'DESC', min_cubic_meters: 'ASC' },
    });
  }

  async findOne(id: string): Promise<Tariff> {
    const tariff = await this.tariffsRepository.findOne({ where: { id } });
    if (!tariff) {
      throw new NotFoundException('Tariff not found');
    }
    return tariff;
  }

  async getValidForDate(
    date: Date,
    cubicMeters?: number,
  ): Promise<Tariff | null> {
    const dateStr = date.toISOString().split('T')[0];
    const query = this.tariffsRepository
      .createQueryBuilder('t')
      .where('t.is_active = true')
      .andWhere('t.valid_from <= :date', { date: dateStr })
      .andWhere('(t.valid_until IS NULL OR t.valid_until >= :date)', {
        date: dateStr,
      });

    if (cubicMeters !== undefined) {
      query
        .andWhere('t.min_cubic_meters <= :cubicMeters', { cubicMeters })
        .andWhere(
          '(t.max_cubic_meters IS NULL OR t.max_cubic_meters >= :cubicMeters)',
          { cubicMeters },
        );
    }

    return query.getOne();
  }

  async validateNoOverlap(
    minCubicMeters: number,
    maxCubicMeters: number | undefined,
    validFrom: string,
    validUntil: string | undefined,
    excludeId?: string,
  ): Promise<void> {
    const query = this.tariffsRepository
      .createQueryBuilder('t')
      .where('t.is_active = true');

    if (excludeId) {
      query.andWhere('t.id != :excludeId', { excludeId });
    }

    query
      .andWhere('t.valid_from <= :validUntil', {
        validUntil: validUntil || '9999-12-31',
      })
      .andWhere('(t.valid_until IS NULL OR t.valid_until >= :validFrom)', {
        validFrom,
      });

    const overlapping = await query.getMany();

    for (const existing of overlapping) {
      const existMin = parseFloat(existing.min_cubic_meters);
      const existMax = existing.max_cubic_meters
        ? parseFloat(existing.max_cubic_meters)
        : Infinity;
      const newMax = maxCubicMeters ?? Infinity;

      if (minCubicMeters <= existMax && newMax >= existMin) {
        throw new BadRequestException(
          `El rango ${minCubicMeters}-${maxCubicMeters || '∞'} m³ se superpone con la tarifa existente "${existing.name}" (${existMin}-${existMax === Infinity ? '∞' : existMax} m³)`,
        );
      }
    }
  }

  async create(dto: CreateTariffDto): Promise<Tariff> {
    if (
      dto.maxCubicMeters !== undefined &&
      dto.maxCubicMeters <= dto.minCubicMeters
    ) {
      throw new BadRequestException(
        'maxCubicMeters must be greater than minCubicMeters',
      );
    }

    if (dto.validUntil && dto.validUntil <= dto.validFrom) {
      throw new BadRequestException(
        'La fecha de fin debe ser posterior a la fecha de inicio',
      );
    }

    await this.validateNoOverlap(
      dto.minCubicMeters,
      dto.maxCubicMeters,
      dto.validFrom,
      dto.validUntil,
    );

    const tariff = this.tariffsRepository.create({
      name: dto.name,
      min_cubic_meters: dto.minCubicMeters.toString(),
      max_cubic_meters: dto.maxCubicMeters?.toString(),
      price_per_cubic_meter: dto.pricePerCubicMeter.toString(),
      valid_from: dto.validFrom,
      valid_until: dto.validUntil,
      is_active: dto.isActive ?? true,
    });
    return this.tariffsRepository.save(tariff);
  }

  async update(id: string, dto: UpdateTariffDto): Promise<Tariff> {
    const tariff = await this.findOne(id);

    const minCubicMeters =
      dto.minCubicMeters ?? parseFloat(tariff.min_cubic_meters);
    const maxCubicMeters =
      dto.maxCubicMeters !== undefined
        ? dto.maxCubicMeters
        : tariff.max_cubic_meters
          ? parseFloat(tariff.max_cubic_meters)
          : undefined;
    const validFrom = dto.validFrom || tariff.valid_from;
    const validUntil =
      dto.validUntil !== undefined ? dto.validUntil : tariff.valid_until;

    if (maxCubicMeters !== undefined && maxCubicMeters <= minCubicMeters) {
      throw new BadRequestException(
        'maxCubicMeters must be greater than minCubicMeters',
      );
    }

    if (validUntil && validUntil <= validFrom) {
      throw new BadRequestException(
        'La fecha de fin debe ser posterior a la fecha de inicio',
      );
    }

    await this.validateNoOverlap(
      minCubicMeters,
      maxCubicMeters,
      validFrom,
      validUntil,
      id,
    );

    Object.assign(tariff, {
      name: dto.name ?? tariff.name,
      min_cubic_meters: minCubicMeters.toString(),
      max_cubic_meters: maxCubicMeters?.toString(),
      price_per_cubic_meter:
        dto.pricePerCubicMeter !== undefined
          ? dto.pricePerCubicMeter.toString()
          : tariff.price_per_cubic_meter,
      valid_from: validFrom,
      valid_until: validUntil,
      is_active: dto.isActive ?? tariff.is_active,
    });
    return this.tariffsRepository.save(tariff);
  }

  async deactivate(id: string): Promise<Tariff> {
    const tariff = await this.findOne(id);
    tariff.is_active = false;
    return this.tariffsRepository.save(tariff);
  }

  async copyTariffs(
    sourceValidFrom: string,
    sourceValidUntil: string | undefined,
    newValidFrom: string,
    newValidUntil: string | undefined,
  ): Promise<{ baseTariff?: any; rangeTariffs: Tariff[] }> {
    const result: { baseTariff?: any; rangeTariffs: Tariff[] } = {
      rangeTariffs: [],
    };

    const rangeTariffs = await this.tariffsRepository.find({
      where: { is_active: true },
    });

    for (const tariff of rangeTariffs) {
      const newTariff = this.tariffsRepository.create({
        name: tariff.name,
        min_cubic_meters: tariff.min_cubic_meters,
        max_cubic_meters: tariff.max_cubic_meters,
        price_per_cubic_meter: tariff.price_per_cubic_meter,
        valid_from: newValidFrom,
        valid_until: newValidUntil,
        is_active: true,
      });
      const saved = await this.tariffsRepository.save(newTariff);
      result.rangeTariffs.push(saved);
    }

    return result;
  }
}
