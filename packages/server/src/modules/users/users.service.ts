import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { generateStrongPassword } from '../../common/utils/password';
import { User, legacyRoleFromRoles } from './entities/user.entity';
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

    const password = generateStrongPassword();
    const passwordHash = await bcrypt.hash(password, 10);
    const user = this.usersRepository.create({
      email: dto.email,
      password_hash: passwordHash,
      full_name: dto.fullName,
      is_active: true,
      must_change_password: true,
    });

    if (dto.roleIds?.length) {
      user.roles = await this.rolesRepository.findBy({
        id: In(dto.roleIds),
      });
    }
    user.role = legacyRoleFromRoles(user.roles);

    const saved = await this.usersRepository.save(user);
    const { password_hash, ...safe } = saved;
    // Returned exactly once: the plaintext is never stored anywhere, so the
    // caller is responsible for handing it over to the account holder.
    return { ...safe, generatedPassword: password };
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

    if (dto.fullName !== undefined) {
      user.full_name = dto.fullName;
    }

    if (dto.roleIds) {
      user.roles = await this.rolesRepository.findBy({
        id: In(dto.roleIds),
      });
      user.role = legacyRoleFromRoles(user.roles);
    }

    const saved = await this.usersRepository.save(user);
    const { password_hash, ...safe } = saved;
    return safe;
  }

  /**
   * Admin-driven credential reset. Issues a fresh temporary secret and puts the
   * account back into the forced-change state, mirroring what `create` does.
   *
   * Uses `update()` rather than `save()` so a loaded relation can never
   * overwrite an unrelated foreign key column on the way through.
   */
  async regeneratePassword(id: string) {
    const existing = await this.usersRepository.findOne({ where: { id } });
    if (!existing) throw new NotFoundException('User not found');

    const password = generateStrongPassword();
    await this.usersRepository.update(id, {
      password_hash: await bcrypt.hash(password, 10),
      must_change_password: true,
    });

    const refreshed = await this.usersRepository.findOne({ where: { id } });
    const { password_hash, ...safe } = refreshed!;
    return { ...safe, generatedPassword: password };
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
