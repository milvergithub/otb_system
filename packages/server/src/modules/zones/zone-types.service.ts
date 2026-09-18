import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ZoneTypeEntity } from './entities/zone-type.entity';
import { CreateZoneTypeDto, UpdateZoneTypeDto } from './dto/zone-type.dto';

@Injectable()
export class ZoneTypesService {
  constructor(
    @InjectRepository(ZoneTypeEntity)
    private readonly zoneTypeRepo: Repository<ZoneTypeEntity>,
  ) {}

  findAll(): Promise<ZoneTypeEntity[]> {
    return this.zoneTypeRepo.find({ order: { name: 'ASC' } });
  }

  async findOne(id: string): Promise<ZoneTypeEntity> {
    const zoneType = await this.zoneTypeRepo.findOneBy({ id });
    if (!zoneType) throw new NotFoundException(`Zone type ${id} not found`);
    return zoneType;
  }

  async create(dto: CreateZoneTypeDto): Promise<ZoneTypeEntity> {
    const existing = await this.zoneTypeRepo.findOneBy({ name: dto.name });
    if (existing) {
      throw new BadRequestException(
        `A zone type with name "${dto.name}" already exists`,
      );
    }
    const zoneType = this.zoneTypeRepo.create(dto);
    return this.zoneTypeRepo.save(zoneType);
  }

  async update(id: string, dto: UpdateZoneTypeDto): Promise<ZoneTypeEntity> {
    const zoneType = await this.findOne(id);
    if (dto.name && dto.name !== zoneType.name) {
      const existing = await this.zoneTypeRepo.findOneBy({ name: dto.name });
      if (existing) {
        throw new BadRequestException(
          `A zone type with name "${dto.name}" already exists`,
        );
      }
    }
    Object.assign(zoneType, dto);
    return this.zoneTypeRepo.save(zoneType);
  }

  async remove(id: string): Promise<void> {
    const zoneType = await this.findOne(id);
    await this.zoneTypeRepo.remove(zoneType);
  }
}
