import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { FineType, FineTypeCode } from './entities/fine-type.entity';
import { CreateFineTypeDto, UpdateFineTypeDto } from './dto/fine-type.dto';

@Injectable()
export class FineTypesService {
  constructor(
    @InjectRepository(FineType)
    private readonly repo: Repository<FineType>,
  ) {}

  async findAll(): Promise<FineType[]> {
    return this.repo.find({ order: { code: 'ASC' } });
  }

  async findOne(id: string): Promise<FineType> {
    const ft = await this.repo.findOne({ where: { id } });
    if (!ft) throw new NotFoundException('Tipo de multa no encontrado');
    return ft;
  }

  async findByCode(code: FineTypeCode): Promise<FineType | null> {
    return this.repo.findOne({ where: { code, is_active: true } });
  }

  async create(dto: CreateFineTypeDto): Promise<FineType> {
    const existing = await this.findByCode(dto.code);
    if (existing) {
      throw new BadRequestException(
        'Ya existe un tipo de multa activo con ese código',
      );
    }
    const entity = this.repo.create({
      code: dto.code,
      name: dto.name,
      description: dto.description,
      amount: dto.amount.toString(),
      is_active: dto.isActive ?? true,
    });
    return this.repo.save(entity);
  }

  async update(id: string, dto: UpdateFineTypeDto): Promise<FineType> {
    const entity = await this.findOne(id);
    Object.assign(entity, {
      code: dto.code ?? entity.code,
      name: dto.name ?? entity.name,
      description: dto.description ?? entity.description,
      amount: dto.amount !== undefined ? dto.amount.toString() : entity.amount,
      is_active: dto.isActive ?? entity.is_active,
    });
    return this.repo.save(entity);
  }

  async remove(id: string): Promise<void> {
    const entity = await this.findOne(id);
    await this.repo.remove(entity);
  }
}
