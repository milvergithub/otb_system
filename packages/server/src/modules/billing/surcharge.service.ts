import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Surcharge, SurchargeType } from './entities/surcharge.entity';
import { CreateSurchargeDto, UpdateSurchargeDto } from './dto/surcharge.dto';
import { AppError } from '../../common/errors/app-error';

@Injectable()
export class SurchargeService {
  constructor(
    @InjectRepository(Surcharge)
    private readonly repository: Repository<Surcharge>,
  ) {}

  async findAll(): Promise<Surcharge[]> {
    return this.repository.find({ order: { name: 'ASC' } });
  }

  async findActive(): Promise<Surcharge[]> {
    return this.repository.find({
      where: { is_active: true },
      order: { name: 'ASC' },
    });
  }

  async findDefaults(): Promise<Surcharge[]> {
    return this.repository.find({
      where: { is_default: true, is_active: true },
      order: { name: 'ASC' },
    });
  }

  async findOne(id: string): Promise<Surcharge> {
    const surcharge = await this.repository.findOne({ where: { id } });
    if (!surcharge) {
      throw new AppError('SURCHARGE_NOT_FOUND');
    }
    return surcharge;
  }

  async create(dto: CreateSurchargeDto): Promise<Surcharge> {
    const existing = await this.repository.findOne({
      where: { name: dto.name },
    });
    if (existing) {
      throw new AppError('SURCHARGE_NAME_EXISTS');
    }

    const surcharge = this.repository.create({
      name: dto.name,
      type: dto.type ?? SurchargeType.FIXED,
      value: dto.value.toString(),
      description: dto.description,
      is_active: dto.is_active ?? true,
      is_default: dto.is_default ?? false,
    });
    return this.repository.save(surcharge);
  }

  async update(id: string, dto: UpdateSurchargeDto): Promise<Surcharge> {
    const surcharge = await this.findOne(id);

    if (dto.name && dto.name !== surcharge.name) {
      const existing = await this.repository.findOne({
        where: { name: dto.name },
      });
      if (existing) {
        throw new AppError('SURCHARGE_NAME_EXISTS');
      }
      surcharge.name = dto.name;
    }

    if (dto.type !== undefined) {
      surcharge.type = dto.type;
    }
    if (dto.value !== undefined) {
      surcharge.value = dto.value.toString();
    }
    if (dto.description !== undefined) {
      surcharge.description = dto.description;
    }
    if (dto.is_active !== undefined) {
      surcharge.is_active = dto.is_active;
    }
    if (dto.is_default !== undefined) {
      surcharge.is_default = dto.is_default;
    }

    return this.repository.save(surcharge);
  }

  async remove(id: string): Promise<void> {
    const surcharge = await this.findOne(id);
    await this.repository.remove(surcharge);
  }

  /**
   * Calculates the surcharge amount for a bill.
   *
   * - fixed:       value (e.g. Bs 10)
   * - percentage:  baseAmount * value / 100 (e.g. 2% of the bill)
   */
  calculateSurchargeAmount(baseAmount: number, surcharge: Surcharge): number {
    const value = parseFloat(surcharge.value);
    if (surcharge.type === SurchargeType.FIXED) {
      return Math.max(0, value);
    }
    return Math.max(0, baseAmount * (value / 100));
  }
}
