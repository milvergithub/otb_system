import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ActivityType } from './entities/activity-type.entity';
import {
  CreateActivityTypeDto,
  UpdateActivityTypeDto,
} from './dto/activity-type.dto';

@Injectable()
export class ActivityTypesService {
  constructor(
    @InjectRepository(ActivityType)
    private readonly repo: Repository<ActivityType>,
  ) {}

  findAll(): Promise<ActivityType[]> {
    return this.repo.find({ order: { name: 'ASC' } });
  }

  async findOne(id: string): Promise<ActivityType> {
    const type = await this.repo.findOneBy({ id });
    if (!type) throw new NotFoundException('Tipo de actividad no encontrado');
    return type;
  }

  async create(dto: CreateActivityTypeDto): Promise<ActivityType> {
    await this.assertCodeAvailable(dto.code);
    return this.repo.save(
      this.repo.create({
        code: dto.code.trim().toUpperCase(),
        name: dto.name,
        description: dto.description ?? null,
        is_active: dto.isActive ?? true,
      }),
    );
  }

  async update(id: string, dto: UpdateActivityTypeDto): Promise<ActivityType> {
    const type = await this.findOne(id);
    if (dto.code && dto.code.trim().toUpperCase() !== type.code) {
      await this.assertCodeAvailable(dto.code, id);
      type.code = dto.code.trim().toUpperCase();
    }
    if (dto.name !== undefined) type.name = dto.name;
    if (dto.description !== undefined) type.description = dto.description;
    if (dto.isActive !== undefined) type.is_active = dto.isActive;
    return this.repo.save(type);
  }

  async remove(id: string): Promise<void> {
    const type = await this.findOne(id);
    await this.repo.remove(type);
  }

  private async assertCodeAvailable(
    code: string,
    currentId?: string,
  ): Promise<void> {
    if (!code?.trim()) {
      throw new BadRequestException('El código es obligatorio');
    }
    const existing = await this.repo.findOneBy({
      code: code.trim().toUpperCase(),
    });
    if (existing && existing.id !== currentId) {
      throw new ConflictException('Ya existe un tipo con ese código');
    }
  }
}
