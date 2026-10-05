import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import {
  FinanceCategory,
  FinanceCategoryType,
} from './entities/finance-category.entity';
import {
  CreateFinanceCategoryDto,
  UpdateFinanceCategoryDto,
} from './dto/finance-category.dto';
import { FinanceTransaction } from './entities/finance-transaction.entity';

@Injectable()
export class FinanceCategoriesService {
  constructor(
    @InjectRepository(FinanceCategory)
    private readonly categoriesRepo: Repository<FinanceCategory>,
    @InjectRepository(FinanceTransaction)
    private readonly transactionsRepo: Repository<FinanceTransaction>,
  ) {}

  findAll(): Promise<FinanceCategory[]> {
    return this.categoriesRepo.find({ order: { name: 'ASC' } });
  }

  async findOne(id: string): Promise<FinanceCategory> {
    const category = await this.categoriesRepo.findOneBy({ id });
    if (!category)
      throw new NotFoundException(`Finance category ${id} not found`);
    return category;
  }

  async create(dto: CreateFinanceCategoryDto): Promise<FinanceCategory> {
    await this.assertNameIsFree(dto.name);
    return this.categoriesRepo.save(
      this.categoriesRepo.create({
        name: dto.name,
        type: dto.type ?? FinanceCategoryType.BOTH,
        is_active: dto.isActive ?? true,
      } as Partial<FinanceCategory>),
    );
  }

  async update(
    id: string,
    dto: UpdateFinanceCategoryDto,
  ): Promise<FinanceCategory> {
    const category = await this.findOne(id);
    if (dto.name && dto.name !== category.name) {
      await this.assertNameIsFree(dto.name);
    }
    Object.assign(category, {
      name: dto.name ?? category.name,
      type: dto.type ?? category.type,
      is_active: dto.isActive ?? category.is_active,
    });
    return this.categoriesRepo.save(category);
  }

  async remove(id: string): Promise<void> {
    const category = await this.findOne(id);
    const inUse = await this.transactionsRepo.count({
      where: { category_id: id },
    });
    if (inUse > 0) {
      throw new BadRequestException(
        `Cannot delete category "${category.name}" because it is used by ${inUse} transaction(s). Deactivate it instead.`,
      );
    }
    await this.categoriesRepo.remove(category);
  }

  private async assertNameIsFree(name: string): Promise<void> {
    const existing = await this.categoriesRepo.findOneBy({ name });
    if (existing) {
      throw new BadRequestException(
        `A finance category with name "${name}" already exists`,
      );
    }
  }
}
