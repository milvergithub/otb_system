import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { setImmediate } from 'node:timers';
import { ILike, IsNull, Not, Repository } from 'typeorm';
import {
  PaginatedResult,
  PaginationDto,
} from '../../common/dto/pagination.dto';
import { buildOrder } from '../../common/utils/sort';
import { Member } from './entities/member.entity';
import { MemberType } from './entities/member-type.entity';
import { CreateMemberDto, UpdateMemberDto } from './dto/member.dto';
import { AppError } from '../../common/errors/app-error';

const SORT_COLUMNS: Record<string, string> = {
  ci: 'ci',
  first_name: 'first_name',
  last_name: 'last_name',
  phone: 'phone',
  address: 'address',
  created_at: 'created_at',
};

export type MemberListStatus = 'active' | 'deleted' | 'all';

@Injectable()
export class MembersService {
  constructor(
    @InjectRepository(Member)
    private readonly membersRepository: Repository<Member>,
    @InjectRepository(MemberType)
    private readonly memberTypeRepository: Repository<MemberType>,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async findAllForSelect(): Promise<
    Pick<Member, 'id' | 'ci' | 'first_name' | 'last_name'>[]
  > {
    return this.membersRepository.find({
      select: ['id', 'ci', 'first_name', 'last_name'],
      where: { deleted_at: IsNull() },
      order: { first_name: 'ASC', last_name: 'ASC' },
    });
  }

  async findAll(
    pagination: PaginationDto,
    search?: string,
    memberTypeId?: string,
    status: MemberListStatus = 'active',
  ): Promise<PaginatedResult<Member>> {
    const { page, limit, sortBy, sortOrder } = pagination;

    const isUnassigned = memberTypeId === 'none' || memberTypeId === 'null';
    const base = isUnassigned
      ? { member_type_id: IsNull() }
      : memberTypeId
        ? { member_type_id: memberTypeId }
        : {};

    const deletedCondition =
      status === 'deleted'
        ? { deleted_at: Not(IsNull()) }
        : status === 'all'
          ? {}
          : { deleted_at: IsNull() };

    // The explicit deleted_at filter keeps this independent of TypeORM's
    // default behavior; withDeleted must be enabled because the deleted
    // branches intentionally query rows that the default excludes.
    const where = search
      ? [
          { ...base, ...deletedCondition, first_name: ILike(`%${search}%`) },
          { ...base, ...deletedCondition, last_name: ILike(`%${search}%`) },
          { ...base, ...deletedCondition, ci: ILike(`%${search}%`) },
        ]
      : [{ ...base, ...deletedCondition }];

    const order = buildOrder(sortBy, sortOrder, SORT_COLUMNS).reduce(
      (acc, { column, dir }) => ({ ...acc, [column]: dir }),
      {} as Record<string, 'ASC' | 'DESC'>,
    );

    const [items, total] = await this.membersRepository.findAndCount({
      relations: ['meters', 'member_type'],
      withDeleted: status !== 'active',
      where,
      order: Object.keys(order).length ? order : { first_name: 'ASC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async findOne(id: string): Promise<Member> {
    const member = await this.membersRepository.findOne({
      where: { id },
      relations: ['meters', 'member_type'],
    });
    if (!member) {
      throw new AppError('MEMBER_NOT_FOUND');
    }
    return member;
  }

  async create(dto: CreateMemberDto): Promise<Member> {
    const existing = await this.membersRepository.findOne({
      where: { ci: dto.ci },
      withDeleted: true,
    });
    if (existing) {
      throw new AppError('MEMBER_CI_EXISTS');
    }
    const memberType = await this.resolveAssignableMemberType(dto.memberTypeId);
    const member = this.membersRepository.create({
      ci: dto.ci,
      first_name: dto.firstName,
      last_name: dto.lastName,
      phone: dto.phone,
      phone_country: dto.phoneCountry ?? 'BO',
      address: dto.address,
      member_type_id: memberType?.id ?? null,
      member_type: memberType,
    });
    const saved = await this.membersRepository.save(member);
    if (saved.phone) {
      setImmediate(() => {
        this.eventEmitter.emit('member.created', {
          phone: saved.phone,
          phone_country: saved.phone_country,
          fullName: `${saved.first_name} ${saved.last_name}`,
        });
      });
    }
    return saved;
  }

  async update(id: string, dto: UpdateMemberDto): Promise<Member> {
    const member = await this.findOne(id);
    if (dto.ci && dto.ci !== member.ci) {
      const existing = await this.membersRepository.findOne({
        where: { ci: dto.ci },
        withDeleted: true,
      });
      if (existing) {
        throw new AppError('MEMBER_CI_EXISTS');
      }
    }
    if (dto.memberTypeId !== undefined) {
      const memberType = await this.resolveAssignableMemberType(
        dto.memberTypeId,
      );
      member.member_type = memberType;
      member.member_type_id = memberType?.id ?? null;
    }
    Object.assign(member, {
      ci: dto.ci ?? member.ci,
      first_name: dto.firstName ?? member.first_name,
      last_name: dto.lastName ?? member.last_name,
      phone: dto.phone ?? member.phone,
      phone_country: dto.phoneCountry ?? member.phone_country,
      address: dto.address ?? member.address,
    });
    return this.membersRepository.save(member);
  }

  async remove(id: string): Promise<void> {
    const member = await this.membersRepository.findOne({
      where: { id },
      withDeleted: true,
    });
    if (!member) {
      throw new AppError('MEMBER_NOT_FOUND');
    }
    if (member.deleted_at) {
      throw new AppError('MEMBER_ALREADY_DELETED');
    }
    // Logical deletion: the row survives so every historical record (payments,
    // fines, attendances, contributions, finance movements) keeps its FK and
    // remains queryable. No other module's data is touched.
    await this.membersRepository.softDelete(id);
  }

  async restore(id: string): Promise<Member> {
    const member = await this.membersRepository.findOne({
      where: { id },
      withDeleted: true,
      relations: ['meters', 'member_type'],
    });
    if (!member) {
      throw new AppError('MEMBER_NOT_FOUND');
    }
    if (!member.deleted_at) {
      throw new AppError('MEMBER_NOT_DELETED');
    }
    // The CI unique index spans deleted rows too: restoring a member whose CI
    // is now held by another active member must surface a clear conflict rather
    // than blowing up on the database constraint.
    const conflict = await this.membersRepository.findOne({
      where: { ci: member.ci, deleted_at: IsNull() },
    });
    if (conflict && conflict.id !== id) {
      throw new AppError('MEMBER_CI_EXISTS');
    }
    await this.membersRepository.restore(id);
    const restored = await this.membersRepository.findOne({
      where: { id },
      relations: ['meters', 'member_type'],
    });
    if (!restored) {
      throw new AppError('MEMBER_NOT_FOUND');
    }
    return restored;
  }

  /**
   * Resolves an optional member type for assignment. `undefined` keeps the
   * current classification untouched, `null` clears it, and a real id must
   * reference an existing and active type.
   */
  private async resolveAssignableMemberType(
    memberTypeId: string | null | undefined,
  ): Promise<MemberType | null> {
    if (memberTypeId === undefined) {
      return null;
    }
    if (memberTypeId === null) {
      return null;
    }
    const memberType = await this.memberTypeRepository.findOneBy({
      id: memberTypeId,
    });
    if (!memberType) {
      throw new AppError('MEMBER_TYPE_NOT_FOUND');
    }
    if (!memberType.is_active) {
      throw new AppError('MEMBER_TYPE_INACTIVE');
    }
    return memberType;
  }
}
