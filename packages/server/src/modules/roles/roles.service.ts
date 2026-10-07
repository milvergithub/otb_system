import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Role } from './entities/role.entity';
import { Permission } from './entities/permission.entity';
import { User, legacyRoleFromRoles } from '../users/entities/user.entity';
import { CreateRoleDto, UpdateRoleDto } from './dto/role.dto';

@Injectable()
export class RolesService {
  constructor(
    @InjectRepository(Role) private readonly rolesRepository: Repository<Role>,
    @InjectRepository(Permission)
    private readonly permissionsRepository: Repository<Permission>,
    @InjectRepository(User) private readonly usersRepository: Repository<User>,
  ) {}

  async findAllRoles() {
    return this.rolesRepository.find({ order: { name: 'ASC' } });
  }

  async findRoleById(id: string) {
    const role = await this.rolesRepository.findOne({
      where: { id },
      relations: ['permissions'],
    });
    if (!role) throw new NotFoundException('Role not found');
    return role;
  }

  async createRole(dto: CreateRoleDto) {
    const existing = await this.rolesRepository.findOne({
      where: { name: dto.name },
    });
    if (existing) throw new BadRequestException('Role name already exists');

    const role = this.rolesRepository.create({
      name: dto.name,
      description: dto.description,
    });

    if (dto.permissionIds?.length) {
      role.permissions = await this.permissionsRepository.findBy({
        id: In(dto.permissionIds),
      });
    }

    return this.rolesRepository.save(role);
  }

  async updateRole(id: string, dto: UpdateRoleDto) {
    const role = await this.findRoleById(id);
    if (role.is_system)
      throw new BadRequestException('Cannot modify system role');

    if (dto.name && dto.name !== role.name) {
      const existing = await this.rolesRepository.findOne({
        where: { name: dto.name },
      });
      if (existing) throw new BadRequestException('Role name already exists');
      role.name = dto.name;
    }

    if (dto.description !== undefined) {
      role.description = dto.description;
    }

    if (dto.permissionIds) {
      role.permissions = await this.permissionsRepository.findBy({
        id: In(dto.permissionIds),
      });
    }

    return this.rolesRepository.save(role);
  }

  async deleteRole(id: string) {
    const role = await this.findRoleById(id);
    if (role.is_system)
      throw new BadRequestException('Cannot delete system role');

    const usersWithRole = await this.usersRepository
      .createQueryBuilder('user')
      .innerJoin('user.roles', 'role', 'role.id = :roleId', { roleId: id })
      .getCount();

    if (usersWithRole > 0) {
      throw new BadRequestException('Cannot delete role assigned to users');
    }

    await this.rolesRepository.remove(role);
  }

  async findAllPermissions() {
    return this.permissionsRepository.find({
      order: { resource: 'ASC', action: 'ASC' },
    });
  }

  async assignPermissionsToRole(roleId: string, permissionIds: string[]) {
    const role = await this.findRoleById(roleId);
    if (role.is_system)
      throw new BadRequestException('Cannot modify system role permissions');

    role.permissions = await this.permissionsRepository.findBy({
      id: In(permissionIds),
    });
    return this.rolesRepository.save(role);
  }

  async getUserPermissions(userId: string): Promise<string[]> {
    const user = await this.usersRepository.findOne({
      where: { id: userId },
      relations: ['roles', 'roles.permissions'],
    });
    if (!user) return [];

    const permissionSet = new Set<string>();
    for (const role of user.roles || []) {
      for (const perm of role.permissions || []) {
        permissionSet.add(`${perm.resource}.${perm.action}`);
      }
    }
    return Array.from(permissionSet);
  }

  async getUserRoles(userId: string) {
    const user = await this.usersRepository.findOne({
      where: { id: userId },
      relations: ['roles'],
    });
    if (!user) throw new NotFoundException('User not found');
    return user.roles;
  }

  async assignRolesToUser(userId: string, roleIds: string[]) {
    const user = await this.usersRepository.findOne({
      where: { id: userId },
      relations: ['roles'],
    });
    if (!user) throw new NotFoundException('User not found');

    user.roles = await this.rolesRepository.findBy({ id: In(roleIds) });
    user.role = legacyRoleFromRoles(user.roles);
    await this.usersRepository.save(user);
    return { success: true };
  }

  async findAllUsers() {
    const users = await this.usersRepository.find({
      relations: ['roles'],
      order: { created_at: 'DESC' },
    });
    return users.map((u) => {
      const { password_hash, ...safe } = u;
      return safe;
    });
  }
}
