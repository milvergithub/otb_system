import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User } from './entities/user.entity';
import { Role } from '../roles/entities/role.entity';
import { CreateUserDto, UpdateUserDto } from './dto/user.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User) private readonly usersRepository: Repository<User>,
    @InjectRepository(Role) private readonly rolesRepository: Repository<Role>,
  ) {}

  async findAll() {
    const users = await this.usersRepository.find({
      relations: ['roles'],
      order: { created_at: 'DESC' },
    });
    return users.map((u) => {
      const { password_hash, ...safe } = u;
      return safe;
    });
  }

  async findOne(id: string) {
    const user = await this.usersRepository.findOne({
      where: { id },
      relations: ['roles'],
    });
    if (!user) throw new NotFoundException('User not found');
    const { password_hash, ...safe } = user;
    return safe;
  }

  async create(dto: CreateUserDto) {
    const existing = await this.usersRepository.findOne({
      where: { email: dto.email },
    });
    if (existing) {
      throw new ConflictException('Email already exists');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const user = this.usersRepository.create({
      email: dto.email,
      password_hash: passwordHash,
      full_name: dto.fullName,
      is_active: true,
    });

    if (dto.roleIds?.length) {
      user.roles = await this.rolesRepository.findBy({
        id: In(dto.roleIds),
      });
    }

    const saved = await this.usersRepository.save(user);
    const { password_hash, ...safe } = saved;
    return safe;
  }

  async update(id: string, dto: UpdateUserDto) {
    const user = await this.usersRepository.findOne({
      where: { id },
      relations: ['roles'],
    });
    if (!user) throw new NotFoundException('User not found');

    if (dto.email && dto.email !== user.email) {
      const existing = await this.usersRepository.findOne({
        where: { email: dto.email },
      });
      if (existing) {
        throw new ConflictException('Email already exists');
      }
      user.email = dto.email;
    }

    if (dto.password) {
      user.password_hash = await bcrypt.hash(dto.password, 10);
    }

    if (dto.fullName !== undefined) {
      user.full_name = dto.fullName;
    }

    if (dto.roleIds) {
      user.roles = await this.rolesRepository.findBy({
        id: In(dto.roleIds),
      });
    }

    const saved = await this.usersRepository.save(user);
    const { password_hash, ...safe } = saved;
    return safe;
  }

  async toggleActive(id: string, isActive: boolean) {
    const user = await this.usersRepository.findOne({ where: { id } });
    if (!user) throw new NotFoundException('User not found');

    user.is_active = isActive;
    const saved = await this.usersRepository.save(user);
    const { password_hash, ...safe } = saved;
    return safe;
  }

  async remove(id: string) {
    const user = await this.usersRepository.findOne({ where: { id } });
    if (!user) throw new NotFoundException('User not found');

    await this.usersRepository.remove(user);
    return { success: true };
  }
}
