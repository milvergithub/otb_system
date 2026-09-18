import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  CreateWaterShareDto,
  UpdateWaterShareDto,
} from './dto/water-share.dto';
import { WaterShare } from './entities/water-share.entity';

@Injectable()
export class SharesService {
  constructor(
    @InjectRepository(WaterShare)
    private readonly repository: Repository<WaterShare>,
  ) {}

  async findAll(includeInactive = false): Promise<WaterShare[]> {
    return this.repository.find({
      where: includeInactive ? {} : { is_active: true },
      order: { valid_from: 'DESC', name: 'ASC' },
    });
  }

  async findActive(): Promise<WaterShare[]> {
    const today = new Date().toISOString().split('T')[0];
    return this.repository
      .createQueryBuilder('ws')
      .where('ws.is_active = true')
      .andWhere('ws.valid_from <= :today', { today })
      .andWhere('(ws.valid_until IS NULL OR ws.valid_until >= :today)', {
        today,
      })
      .orderBy('ws.name', 'ASC')
      .getMany();
  }

  async findOne(id: string): Promise<WaterShare> {
    const share = await this.repository.findOne({ where: { id } });
    if (!share) {
      throw new NotFoundException('Water share not found');
    }
    return share;
  }

  async getActiveForDate(date: Date): Promise<WaterShare | null> {
    const dateStr = date.toISOString().split('T')[0];
    return this.repository
      .createQueryBuilder('ws')
      .where('ws.is_active = true')
      .andWhere('ws.valid_from <= :date', { date: dateStr })
      .andWhere('(ws.valid_until IS NULL OR ws.valid_until >= :date)', {
        date: dateStr,
      })
      .getOne();
  }

  async validateNoOverlap(
    validFrom: string,
    validUntil: string | undefined,
    excludeId?: string,
  ): Promise<void> {
    const query = this.repository
      .createQueryBuilder('ws')
      .where('ws.is_active = true');

    if (excludeId) {
      query.andWhere('ws.id != :excludeId', { excludeId });
    }

    query
      .andWhere('ws.valid_from <= :validUntil', {
        validUntil: validUntil || '9999-12-31',
      })
      .andWhere('(ws.valid_until IS NULL OR ws.valid_until >= :validFrom)', {
        validFrom,
      });

    const overlapping = await query.getOne();

    if (overlapping) {
      throw new BadRequestException(
        `Ya existe una tarifa de acción vigente para este período: "${overlapping.name}"`,
      );
    }
  }

  async create(dto: CreateWaterShareDto): Promise<WaterShare> {
    if (dto.validUntil && dto.validUntil <= dto.validFrom) {
      throw new BadRequestException(
        'La fecha de fin debe ser posterior a la fecha de inicio',
      );
    }

    await this.validateNoOverlap(dto.validFrom, dto.validUntil);

    const share = this.repository.create({
      name: dto.name,
      amount: dto.amount.toString(),
      valid_from: dto.validFrom,
      valid_until: dto.validUntil,
      is_active: dto.isActive ?? true,
    });
    return this.repository.save(share);
  }

  async update(id: string, dto: UpdateWaterShareDto): Promise<WaterShare> {
    const share = await this.findOne(id);

    const validFrom = dto.validFrom || share.valid_from;
    const validUntil =
      dto.validUntil !== undefined ? dto.validUntil : share.valid_until;

    if (validUntil && validUntil <= validFrom) {
      throw new BadRequestException(
        'La fecha de fin debe ser posterior a la fecha de inicio',
      );
    }

    await this.validateNoOverlap(validFrom, validUntil, id);

    Object.assign(share, {
      name: dto.name ?? share.name,
      amount: dto.amount !== undefined ? dto.amount.toString() : share.amount,
      valid_from: validFrom,
      valid_until: validUntil,
      is_active: dto.isActive ?? share.is_active,
    });

    return this.repository.save(share);
  }

  async deactivate(id: string): Promise<WaterShare> {
    const share = await this.findOne(id);
    share.is_active = false;
    return this.repository.save(share);
  }
}
