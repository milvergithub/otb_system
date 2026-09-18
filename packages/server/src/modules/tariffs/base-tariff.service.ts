import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  CreateBaseTariffDto,
  UpdateBaseTariffDto,
} from './dto/base-tariff.dto';
import { BaseTariff } from './entities/base-tariff.entity';

@Injectable()
export class BaseTariffService {
  constructor(
    @InjectRepository(BaseTariff)
    private readonly repository: Repository<BaseTariff>,
  ) {}

  async findAll(): Promise<BaseTariff[]> {
    return this.repository.find({
      relations: ['type'],
      order: { valid_from: 'DESC', name: 'ASC' },
    });
  }

  async findActive(): Promise<BaseTariff[]> {
    const today = new Date().toISOString().split('T')[0];
    return this.repository
      .createQueryBuilder('bt')
      .leftJoinAndSelect('bt.type', 'type')
      .where('bt.is_active = true')
      .andWhere('bt.valid_from <= :today', { today })
      .andWhere('(bt.valid_until IS NULL OR bt.valid_until >= :today)', {
        today,
      })
      .orderBy('bt.name', 'ASC')
      .getMany();
  }

  async findOne(id: string): Promise<BaseTariff> {
    const tariff = await this.repository.findOne({ where: { id } });
    if (!tariff) {
      throw new NotFoundException('Base tariff not found');
    }
    return tariff;
  }

  async getValidForDate(
    date: Date,
    typeId?: string,
  ): Promise<BaseTariff | null> {
    const dateStr = date.toISOString().split('T')[0];

    // First try to find a tariff for the specific meter type
    if (typeId) {
      const specific = await this.repository
        .createQueryBuilder('bt')
        .leftJoinAndSelect('bt.type', 'type')
        .where('bt.is_active = true')
        .andWhere('bt.type_id = :typeId', { typeId })
        .andWhere('bt.valid_from <= :date', { date: dateStr })
        .andWhere('(bt.valid_until IS NULL OR bt.valid_until >= :date)', {
          date: dateStr,
        })
        .getOne();
      if (specific) return specific;
    }

    // Fallback to the global tariff (type_id IS NULL)
    return this.repository
      .createQueryBuilder('bt')
      .leftJoinAndSelect('bt.type', 'type')
      .where('bt.is_active = true')
      .andWhere('bt.type_id IS NULL')
      .andWhere('bt.valid_from <= :date', { date: dateStr })
      .andWhere('(bt.valid_until IS NULL OR bt.valid_until >= :date)', {
        date: dateStr,
      })
      .getOne();
  }

  async validateNoOverlap(
    validFrom: string,
    validUntil: string | undefined,
    typeId: string | null | undefined,
    excludeId?: string,
  ): Promise<void> {
    const query = this.repository
      .createQueryBuilder('bt')
      .where('bt.is_active = true');

    if (excludeId) {
      query.andWhere('bt.id != :excludeId', { excludeId });
    }

    // Overlap check is scoped to the same type (both NULL = both global)
    if (typeId) {
      query.andWhere('bt.type_id = :typeId', { typeId });
    } else {
      query.andWhere('bt.type_id IS NULL');
    }

    query
      .andWhere('bt.valid_from <= :validUntil', {
        validUntil: validUntil || '9999-12-31',
      })
      .andWhere('(bt.valid_until IS NULL OR bt.valid_until >= :validFrom)', {
        validFrom,
      });

    const overlapping = await query.getOne();

    if (overlapping) {
      throw new BadRequestException(
        `Ya existe una tarifa base vigente para este período: "${overlapping.name}"`,
      );
    }
  }

  async create(dto: CreateBaseTariffDto): Promise<BaseTariff> {
    if (dto.validUntil && dto.validUntil <= dto.validFrom) {
      throw new BadRequestException(
        'La fecha de fin debe ser posterior a la fecha de inicio',
      );
    }

    await this.validateNoOverlap(dto.validFrom, dto.validUntil, dto.typeId);

    const tariff = this.repository.create({
      name: dto.name,
      amount: dto.amount.toString(),
      valid_from: dto.validFrom,
      valid_until: dto.validUntil,
      is_active: dto.isActive ?? true,
      type_id: dto.typeId || null,
    });
    return this.repository.save(tariff);
  }

  async update(id: string, dto: UpdateBaseTariffDto): Promise<BaseTariff> {
    const tariff = await this.findOne(id);

    const validFrom = dto.validFrom || tariff.valid_from;
    const validUntil =
      dto.validUntil !== undefined ? dto.validUntil : tariff.valid_until;

    if (validUntil && validUntil <= validFrom) {
      throw new BadRequestException(
        'La fecha de fin debe ser posterior a la fecha de inicio',
      );
    }

    await this.validateNoOverlap(
      validFrom,
      validUntil,
      dto.typeId ?? tariff.type_id,
      id,
    );

    Object.assign(tariff, {
      name: dto.name ?? tariff.name,
      amount: dto.amount !== undefined ? dto.amount.toString() : tariff.amount,
      valid_from: validFrom,
      valid_until: validUntil,
      is_active: dto.isActive ?? tariff.is_active,
      type_id: dto.typeId !== undefined ? dto.typeId || null : tariff.type_id,
    });

    return this.repository.save(tariff);
  }

  async deactivate(id: string): Promise<BaseTariff> {
    const tariff = await this.findOne(id);
    tariff.is_active = false;
    return this.repository.save(tariff);
  }

  async remove(id: string): Promise<void> {
    const tariff = await this.findOne(id);
    await this.repository.remove(tariff);
  }
}
