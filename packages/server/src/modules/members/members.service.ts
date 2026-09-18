import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { setImmediate } from 'node:timers';
import { ILike, Repository } from 'typeorm';
import {
  PaginatedResult,
  PaginationDto,
} from '../../common/dto/pagination.dto';
import { buildOrder } from '../../common/utils/sort';
import { Member } from './entities/member.entity';
import { CreateMemberDto, UpdateMemberDto } from './dto/member.dto';

const SORT_COLUMNS: Record<string, string> = {
  ci: 'ci',
  first_name: 'first_name',
  last_name: 'last_name',
  phone: 'phone',
  address: 'address',
  created_at: 'created_at',
};

@Injectable()
export class MembersService {
  constructor(
    @InjectRepository(Member)
    private readonly membersRepository: Repository<Member>,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async findAllForSelect(): Promise<
    Pick<Member, 'id' | 'ci' | 'first_name' | 'last_name'>[]
  > {
    return this.membersRepository.find({
      select: ['id', 'ci', 'first_name', 'last_name'],
      order: { first_name: 'ASC', last_name: 'ASC' },
    });
  }

  async findAll(
    pagination: PaginationDto,
    search?: string,
  ): Promise<PaginatedResult<Member>> {
    const { page, limit, sortBy, sortOrder } = pagination;
    const where = search
      ? [
          { first_name: ILike(`%${search}%`) },
          { last_name: ILike(`%${search}%`) },
          { ci: ILike(`%${search}%`) },
        ]
      : undefined;

    const order = buildOrder(sortBy, sortOrder, SORT_COLUMNS).reduce(
      (acc, { column, dir }) => ({ ...acc, [column]: dir }),
      {} as Record<string, 'ASC' | 'DESC'>,
    );

    const [items, total] = await this.membersRepository.findAndCount({
      relations: ['meters'],
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
      relations: ['meters'],
    });
    if (!member) {
      throw new NotFoundException('Member not found');
    }
    return member;
  }

  async create(dto: CreateMemberDto): Promise<Member> {
    const existing = await this.membersRepository.findOne({
      where: { ci: dto.ci },
    });
    if (existing) {
      throw new BadRequestException('A member with this CI already exists');
    }
    const member = this.membersRepository.create({
      ci: dto.ci,
      first_name: dto.firstName,
      last_name: dto.lastName,
      phone: dto.phone,
      phone_country: dto.phoneCountry ?? 'BO',
      address: dto.address,
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
      });
      if (existing) {
        throw new BadRequestException('A member with this CI already exists');
      }
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
    const member = await this.findOne(id);
    await this.membersRepository.remove(member);
  }
}
