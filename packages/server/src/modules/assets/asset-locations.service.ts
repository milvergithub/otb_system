import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Asset } from './entities/asset.entity';
import { AssetLocation } from './entities/asset-location.entity';
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
      throw new NotFoundException(`Asset location ${id} not found`);
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
      throw new BadRequestException(
        `Cannot delete asset location "${location.name}" because ${inUse} asset(s) are stored there. Deactivate it instead.`,
      );
    }

    await this.locationRepo.remove(location);
  }

  private async assertNameIsFree(name: string): Promise<void> {
    const existing = await this.locationRepo.findOneBy({ name });
    if (existing) {
      throw new BadRequestException(
        `An asset location with name "${name}" already exists`,
      );
    }
  }
}
