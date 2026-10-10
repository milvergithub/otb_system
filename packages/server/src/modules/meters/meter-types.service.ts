import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MeterTypeEntity } from './entities/meter-type.entity';
import { CreateMeterTypeDto, UpdateMeterTypeDto } from './dto/meter-type.dto';
import { AppError } from '../../common/errors/app-error';

@Injectable()
export class MeterTypesService {
  constructor(
    @InjectRepository(MeterTypeEntity)
    private readonly meterTypeRepo: Repository<MeterTypeEntity>,
  ) {}

  findAll(): Promise<MeterTypeEntity[]> {
    return this.meterTypeRepo.find({ order: { name: 'ASC' } });
  }

  async findOne(id: string): Promise<MeterTypeEntity> {
    const meterType = await this.meterTypeRepo.findOneBy({ id });
    if (!meterType) throw new AppError('METER_TYPE_NOT_FOUND');
    return meterType;
  }

  async create(dto: CreateMeterTypeDto): Promise<MeterTypeEntity> {
    await this.assertCodeAvailable(dto.code);
    const existing = await this.meterTypeRepo.findOneBy({ name: dto.name });
    if (existing) {
      throw new AppError('METER_TYPE_NAME_EXISTS', { name: dto.name });
    }
    const meterType = this.meterTypeRepo.create({
      code: dto.code.trim().toUpperCase(),
      name: dto.name,
    });
    return this.meterTypeRepo.save(meterType);
  }

  async update(id: string, dto: UpdateMeterTypeDto): Promise<MeterTypeEntity> {
    const meterType = await this.findOne(id);
    if (dto.name && dto.name !== meterType.name) {
      const existing = await this.meterTypeRepo.findOneBy({ name: dto.name });
      if (existing) {
        throw new AppError('METER_TYPE_NAME_EXISTS', { name: dto.name });
      }
    }
    if (dto.name !== undefined) meterType.name = dto.name;
    return this.meterTypeRepo.save(meterType);
  }

  async remove(id: string): Promise<void> {
    const meterType = await this.findOne(id);
    await this.meterTypeRepo.remove(meterType);
  }

  private async assertCodeAvailable(
    code: string,
    currentId?: string,
  ): Promise<void> {
    if (!code?.trim()) {
      throw new AppError('METER_TYPE_CODE_REQUIRED');
    }
    const existing = await this.meterTypeRepo.findOneBy({
      code: code.trim().toUpperCase(),
    });
    if (existing && existing.id !== currentId) {
      throw new AppError('METER_TYPE_CODE_EXISTS');
    }
  }
}
