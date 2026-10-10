import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Asset } from './entities/asset.entity';
import { AssetCategory } from './entities/asset-category.entity';
import { AppError } from '../../common/errors/app-error';
import {
  CreateAssetCategoryDto,
  UpdateAssetCategoryDto,
} from './dto/asset-category.dto';

@Injectable()
export class AssetCategoriesService {
  constructor(
    @InjectRepository(AssetCategory)
    private readonly categoryRepo: Repository<AssetCategory>,
    @InjectRepository(Asset)
    private readonly assetsRepo: Repository<Asset>,
  ) {}

  findAll(): Promise<AssetCategory[]> {
    return this.categoryRepo.find({ order: { name: 'ASC' } });
  }

  async findOne(id: string): Promise<AssetCategory> {
    const category = await this.categoryRepo.findOneBy({ id });
    if (!category) {
      throw new AppError('ASSET_CATEGORY_NOT_FOUND');
    }
    return category;
  }

  async create(dto: CreateAssetCategoryDto): Promise<AssetCategory> {
    await this.assertNameIsFree(dto.name);
    const category = this.categoryRepo.create({
      name: dto.name,
      description: dto.description,
      is_active: dto.isActive ?? true,
    });
    return this.categoryRepo.save(category);
  }

  async update(
    id: string,
    dto: UpdateAssetCategoryDto,
  ): Promise<AssetCategory> {
    const category = await this.findOne(id);
    if (dto.name && dto.name !== category.name) {
      await this.assertNameIsFree(dto.name);
    }
    Object.assign(category, {
      name: dto.name ?? category.name,
      description: dto.description ?? category.description,
      is_active: dto.isActive ?? category.is_active,
    });
    return this.categoryRepo.save(category);
  }

  async remove(id: string): Promise<void> {
    const category = await this.findOne(id);
    const inUse = await this.assetsRepo
      .createQueryBuilder('a')
      .where('a.category_id = :id', { id })
      .getCount();

    if (inUse > 0) {
      throw new AppError('ASSET_CATEGORY_IN_USE', {
        name: category.name,
        count: inUse,
      });
    }

    await this.categoryRepo.remove(category);
  }

  private async assertNameIsFree(name: string): Promise<void> {
    const existing = await this.categoryRepo.findOneBy({ name });
    if (existing) {
      throw new AppError('ASSET_CATEGORY_NAME_EXISTS', { name });
    }
  }
}
