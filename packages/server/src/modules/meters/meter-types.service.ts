import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MeterTypeEntity } from './entities/meter-type.entity';
import { CreateMeterTypeDto, UpdateMeterTypeDto } from './dto/meter-type.dto';

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
    if (!meterType) throw new NotFoundException(`Meter type ${id} not found`);
    return meterType;
  }

  async create(dto: CreateMeterTypeDto): Promise<MeterTypeEntity> {
    const existing = await this.meterTypeRepo.findOneBy({ name: dto.name });
    if (existing) {
      throw new BadRequestException(
        `A meter type with name "${dto.name}" already exists`,
      );
    }
    const meterType = this.meterTypeRepo.create(dto);
    return this.meterTypeRepo.save(meterType);
  }

  async update(id: string, dto: UpdateMeterTypeDto): Promise<MeterTypeEntity> {
    const meterType = await this.findOne(id);
    if (dto.name && dto.name !== meterType.name) {
      const existing = await this.meterTypeRepo.findOneBy({ name: dto.name });
      if (existing) {
        throw new BadRequestException(
          `A meter type with name "${dto.name}" already exists`,
        );
      }
    }
    Object.assign(meterType, dto);
    return this.meterTypeRepo.save(meterType);
  }

  async remove(id: string): Promise<void> {
    const meterType = await this.findOne(id);
    await this.meterTypeRepo.remove(meterType);
  }
}
