import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Zone } from './zone.entity';
import { CreateZoneDto, UpdateZoneDto } from './dto/zone.dto';

@Injectable()
export class ZonesService {
  constructor(
    @InjectRepository(Zone)
    private readonly zoneRepo: Repository<Zone>,
  ) {}

  findAll(): Promise<Zone[]> {
    return this.zoneRepo.find({
      relations: ['zoneType'],
      order: { created_at: 'DESC' },
    });
  }

  async findOne(id: string): Promise<Zone> {
    const zone = await this.zoneRepo.findOneBy({ id });
    if (!zone) throw new NotFoundException(`Zone ${id} not found`);
    return zone;
  }

  create(dto: CreateZoneDto): Promise<Zone> {
    const zone = this.zoneRepo.create(dto);
    return this.zoneRepo.save(zone);
  }

  async update(id: string, dto: UpdateZoneDto): Promise<Zone> {
    const zone = await this.findOne(id);
    Object.assign(zone, dto);
    return this.zoneRepo.save(zone);
  }

  async remove(id: string): Promise<void> {
    const zone = await this.findOne(id);
    await this.zoneRepo.remove(zone);
  }
}
