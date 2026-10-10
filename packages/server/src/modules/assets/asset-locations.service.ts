import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Asset } from './entities/asset.entity';
import { AssetLocation } from './entities/asset-location.entity';
import { AppError } from '../../common/errors/app-error';
import {
  CreateAssetLocationDto,
  UpdateAssetLocationDto,
} from './dto/asset-location.dto';

@Injectable()
export class AssetLocationsService {
  constructor(
    @InjectRepository(AssetLocation)
    private readonly locationRepo: Repository<AssetLocation>,
    @InjectRepository(Asset)
    private readonly assetsRepo: Repository<Asset>,
  ) {}

  findAll(): Promise<AssetLocation[]> {
    return this.locationRepo.find({ order: { name: 'ASC' } });
  }

  async findOne(id: string): Promise<AssetLocation> {
    const location = await this.locationRepo.findOneBy({ id });
    if (!location) {
      throw new AppError('ASSET_LOCATION_NOT_FOUND');
    }
    return location;
  }

  async create(dto: CreateAssetLocationDto): Promise<AssetLocation> {
    await this.assertNameIsFree(dto.name);
    const location = this.locationRepo.create({
      name: dto.name,
      description: dto.description,
      is_active: dto.isActive ?? true,
    });
    return this.locationRepo.save(location);
  }

  async update(
    id: string,
    dto: UpdateAssetLocationDto,
  ): Promise<AssetLocation> {
    const location = await this.findOne(id);
    if (dto.name && dto.name !== location.name) {
      await this.assertNameIsFree(dto.name);
    }
    Object.assign(location, {
      name: dto.name ?? location.name,
      description: dto.description ?? location.description,
      is_active: dto.isActive ?? location.is_active,
    });
    return this.locationRepo.save(location);
  }

  async remove(id: string): Promise<void> {
    const location = await this.findOne(id);
    const inUse = await this.assetsRepo
      .createQueryBuilder('a')
      .where('a.location_id = :id', { id })
      .getCount();

    if (inUse > 0) {
      throw new AppError('ASSET_LOCATION_IN_USE', {
        name: location.name,
        count: inUse,
      });
    }

    await this.locationRepo.remove(location);
  }

  private async assertNameIsFree(name: string): Promise<void> {
    const existing = await this.locationRepo.findOneBy({ name });
    if (existing) {
      throw new AppError('ASSET_LOCATION_NAME_EXISTS', { name });
    }
  }
}
