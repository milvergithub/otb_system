import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Member } from './entities/member.entity';
import { MemberType } from './entities/member-type.entity';
import { AppError } from '../../common/errors/app-error';
import {
  CreateMemberTypeDto,
  UpdateMemberTypeDto,
} from './dto/member-type.dto';

export interface MemberTypeWithCount extends MemberType {
  member_count: number;
}

@Injectable()
export class MemberTypesService {
  constructor(
    @InjectRepository(MemberType)
    private readonly memberTypeRepo: Repository<MemberType>,
    @InjectRepository(Member)
    private readonly membersRepository: Repository<Member>,
  ) {}

  async findAll(
    search?: string,
    includeInactive = false,
  ): Promise<MemberTypeWithCount[]> {
    const qb = this.memberTypeRepo.createQueryBuilder('mt');
    if (search?.trim()) {
      qb.andWhere('(mt.name ILIKE :search OR mt.code ILIKE :search)', {
        search: `%${search.trim()}%`,
      });
    }
    if (!includeInactive) {
      qb.andWhere('mt.is_active = true');
    }
    qb.orderBy('mt.sort_order', 'ASC').addOrderBy('mt.name', 'ASC');
    const types = await qb.getMany();

    const counts = await this.membersRepository
      .createQueryBuilder('m')
      .select('m.member_type_id', 'member_type_id')
      .addSelect('COUNT(*)', 'count')
      .where('m.member_type_id IS NOT NULL')
      .groupBy('m.member_type_id')
      .getRawMany<{ member_type_id: string; count: string }>();

    const countMap = new Map(
      counts.map((c) => [c.member_type_id, Number(c.count)]),
    );

    return types.map((type) => ({
      ...type,
      member_count: countMap.get(type.id) ?? 0,
    }));
  }

  async findOne(id: string): Promise<MemberType> {
    const memberType = await this.memberTypeRepo.findOneBy({ id });
    if (!memberType) {
      throw new AppError('MEMBER_TYPE_NOT_FOUND');
    }
    return memberType;
  }

  async create(dto: CreateMemberTypeDto): Promise<MemberType> {
    const code = this.normalizeCode(dto.code);
    await this.assertCodeAvailable(code);
    await this.assertNameAvailable(dto.name);
    const memberType = this.memberTypeRepo.create({
      code,
      name: dto.name.trim(),
      description: dto.description?.trim() || null,
      is_active: dto.isActive ?? true,
      sort_order: dto.sortOrder ?? 0,
    });
    return this.memberTypeRepo.save(memberType);
  }

  async update(id: string, dto: UpdateMemberTypeDto): Promise<MemberType> {
    const memberType = await this.findOne(id);
    if (dto.code !== undefined) {
      const code = this.normalizeCode(dto.code);
      if (code !== memberType.code) {
        await this.assertCodeAvailable(code, id);
      }
      memberType.code = code;
    }
    if (dto.name !== undefined) {
      const name = dto.name.trim();
      if (name !== memberType.name) {
        await this.assertNameAvailable(name, id);
      }
      memberType.name = name;
    }
    if (dto.description !== undefined) {
      memberType.description = dto.description?.trim() || null;
    }
    if (dto.isActive !== undefined) {
      memberType.is_active = dto.isActive;
    }
    if (dto.sortOrder !== undefined) {
      memberType.sort_order = dto.sortOrder;
    }
    return this.memberTypeRepo.save(memberType);
  }

  async setStatus(id: string, isActive: boolean): Promise<MemberType> {
    const memberType = await this.findOne(id);
    memberType.is_active = isActive;
    return this.memberTypeRepo.save(memberType);
  }

  async remove(id: string): Promise<void> {
    const memberType = await this.findOne(id);
    const assigned = await this.membersRepository.count({
      where: { member_type_id: id },
    });
    if (assigned > 0) {
      throw new AppError('MEMBER_TYPE_IN_USE');
    }
    await this.memberTypeRepo.remove(memberType);
  }

  private normalizeCode(code: string): string {
    return code.trim().toUpperCase();
  }

  private async assertCodeAvailable(
    code: string,
    currentId?: string,
  ): Promise<void> {
    if (!code?.trim()) {
      throw new AppError('MEMBER_TYPE_CODE_REQUIRED');
    }
    const existing = await this.memberTypeRepo.findOneBy({ code });
    if (existing && existing.id !== currentId) {
      throw new AppError('MEMBER_TYPE_CODE_EXISTS');
    }
  }

  private async assertNameAvailable(
    name: string,
    currentId?: string,
  ): Promise<void> {
    if (!name?.trim()) {
      throw new AppError('MEMBER_TYPE_NAME_REQUIRED');
    }
    const existing = await this.memberTypeRepo.findOneBy({ name: name.trim() });
    if (existing && existing.id !== currentId) {
      throw new AppError('MEMBER_TYPE_NAME_EXISTS');
    }
  }
}
