import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { In, Repository } from 'typeorm';
import { User, UserRole } from '../users/entities/user.entity';
import { Role } from '../roles/entities/role.entity';
import { Permission } from '../roles/entities/permission.entity';
import { SettingsService } from './settings.service';

export const DEFAULT_PERMISSIONS = [
  { resource: 'members', action: 'read', description: 'View members' },
  { resource: 'members', action: 'create', description: 'Create members' },
  { resource: 'members', action: 'update', description: 'Update members' },
  { resource: 'members', action: 'delete', description: 'Delete members' },
  { resource: 'meters', action: 'read', description: 'View meters' },
  { resource: 'meters', action: 'create', description: 'Create meters' },
  { resource: 'meters', action: 'update', description: 'Update meters' },
  { resource: 'meters', action: 'delete', description: 'Delete meters' },
  {
    resource: 'meters',
    action: 'sharePayments',
    description: 'Register meter share payments',
  },
  { resource: 'consumption', action: 'read', description: 'View consumption' },
  {
    resource: 'consumption',
    action: 'create',
    description: 'Record consumption',
  },
  {
    resource: 'consumption',
    action: 'delete',
    description: 'Delete consumption',
  },
  { resource: 'billing', action: 'read', description: 'View billing' },
  { resource: 'billing', action: 'create', description: 'Generate bills' },
  { resource: 'billing', action: 'update', description: 'Update billing' },
  {
    resource: 'billing',
    action: 'download',
    description: 'Download billing receipts',
  },
  { resource: 'billing', action: 'viewBill', description: 'View bill details' },
  {
    resource: 'billing',
    action: 'delete',
    description: 'Delete billing / discounts',
  },
  { resource: 'tariffs', action: 'read', description: 'View tariffs' },
  { resource: 'tariffs', action: 'create', description: 'Create tariffs' },
  { resource: 'tariffs', action: 'update', description: 'Update tariffs' },
  { resource: 'tariffs', action: 'delete', description: 'Delete tariffs' },
  {
    resource: 'reports',
    action: 'dashboard',
    description: 'View dashboard reports',
  },
  {
    resource: 'reports',
    action: 'revenue',
    description: 'View revenue reports',
  },
  {
    resource: 'reports',
    action: 'overdue',
    description: 'View overdue reports',
  },
  { resource: 'reports', action: 'read', description: 'View reports' },
  { resource: 'reports', action: 'export', description: 'Export reports' },
  {
    resource: 'notifications',
    action: 'read',
    description: 'View notifications',
  },
  {
    resource: 'notifications',
    action: 'update',
    description: 'Update notifications',
  },
  { resource: 'settings', action: 'read', description: 'View settings' },
  { resource: 'settings', action: 'update', description: 'Update settings' },
  { resource: 'roles', action: 'read', description: 'View roles' },
  { resource: 'roles', action: 'create', description: 'Create roles' },
  { resource: 'roles', action: 'update', description: 'Update roles' },
  { resource: 'roles', action: 'delete', description: 'Delete roles' },
  { resource: 'users', action: 'read', description: 'View users' },
  { resource: 'users', action: 'create', description: 'Create users' },
  { resource: 'users', action: 'update', description: 'Update users' },
  { resource: 'users', action: 'delete', description: 'Delete users' },
  { resource: 'users', action: 'roles', description: 'Assign roles to users' },
  {
    resource: 'users',
    action: 'archive',
    description: 'Activate or deactivate users',
  },
  { resource: 'audit', action: 'read', description: 'View audit logs' },
  { resource: 'activities', action: 'read', description: 'View activities' },
  {
    resource: 'activities',
    action: 'create',
    description: 'Create activities',
  },
  {
    resource: 'activities',
    action: 'update',
    description: 'Update activities',
  },
  {
    resource: 'activities',
    action: 'delete',
    description: 'Delete activities',
  },
  {
    resource: 'activities',
    action: 'all',
    description: 'View all activities',
  },
  {
    resource: 'activities',
    action: 'manageAttendance',
    description: 'Take and finalize activity attendance',
  },
  {
    resource: 'activities',
    action: 'manageFines',
    description: 'Create and manage activity fines',
  },
  {
    resource: 'activities',
    action: 'manageEvidence',
    description: 'Upload and delete activity evidence',
  },
  { resource: 'zones', action: 'read', description: 'View zones' },
  { resource: 'zones', action: 'create', description: 'Create zones' },
  { resource: 'zones', action: 'update', description: 'Update zones' },
  { resource: 'zones', action: 'delete', description: 'Delete zones' },
  { resource: 'zone_types', action: 'read', description: 'View zone types' },
  {
    resource: 'zone_types',
    action: 'create',
    description: 'Create zone types',
  },
  {
    resource: 'zone_types',
    action: 'update',
    description: 'Update zone types',
  },
  {
    resource: 'zone_types',
    action: 'delete',
    description: 'Delete zone types',
  },
  { resource: 'meter_types', action: 'read', description: 'View meter types' },
  {
    resource: 'meter_types',
    action: 'create',
    description: 'Create meter types',
  },
  {
    resource: 'meter_types',
    action: 'update',
    description: 'Update meter types',
  },
  {
    resource: 'meter_types',
    action: 'delete',
    description: 'Delete meter types',
  },
  { resource: 'shares', action: 'read', description: 'View water shares' },
  {
    resource: 'shares',
    action: 'create',
    description: 'Create water shares',
  },
  {
    resource: 'shares',
    action: 'update',
    description: 'Update water shares',
  },
  {
    resource: 'shares',
    action: 'delete',
    description: 'Delete water shares',
  },
  { resource: 'discounts', action: 'read', description: 'View discounts' },
  {
    resource: 'discounts',
    action: 'create',
    description: 'Create discounts',
  },
  {
    resource: 'discounts',
    action: 'update',
    description: 'Update discounts',
  },
  {
    resource: 'discounts',
    action: 'delete',
    description: 'Delete discounts',
  },
  {
    resource: 'members',
    action: 'viewFines',
    description: 'View member fines',
  },
  { resource: 'assets', action: 'read', description: 'View assets' },
  { resource: 'assets', action: 'create', description: 'Create assets' },
  { resource: 'assets', action: 'update', description: 'Update assets' },
  { resource: 'assets', action: 'delete', description: 'Delete assets' },
  {
    resource: 'assets',
    action: 'loan',
    description: 'Register asset loans and returns',
  },
  {
    resource: 'assets',
    action: 'maintenance',
    description: 'Register asset maintenance',
  },
  {
    resource: 'assets',
    action: 'retire',
    description: 'Retire and restore assets',
  },
  { resource: 'finances', action: 'read', description: 'View finances' },
  {
    resource: 'finances',
    action: 'all',
    description:
      'View all finance movements (visibility only, never financial responsibility)',
  },
  {
    resource: 'finances',
    action: 'create',
    description: 'Create finance transactions',
  },
  {
    resource: 'finances',
    action: 'update',
    description: 'Update finance transactions',
  },
  {
    resource: 'finances',
    action: 'void',
    description: 'Void finance transactions',
  },
  {
    resource: 'finances',
    action: 'export',
    description: 'Export finance reports',
  },
];

@Injectable()
export class SeederService implements OnModuleInit {
  private readonly logger = new Logger(SeederService.name);

  constructor(
    @InjectRepository(User)
    private readonly usersRepository: Repository<User>,
    @InjectRepository(Role)
    private readonly rolesRepository: Repository<Role>,
    @InjectRepository(Permission)
    private readonly permissionsRepository: Repository<Permission>,
    private readonly settingsService: SettingsService,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.seedPermissions();
    await this.seedRoles();
    await this.seedAdminUser();
    await this.settingsService.initializeDefaults();
  }

  private async seedPermissions(): Promise<void> {
    for (const perm of DEFAULT_PERMISSIONS) {
      const name = `${perm.resource}.${perm.action}`;
      const existing = await this.permissionsRepository.findOne({
        where: { name },
      });
      if (!existing) {
        await this.permissionsRepository.save(
          this.permissionsRepository.create({
            name,
            resource: perm.resource,
            action: perm.action,
            description: perm.description,
          }),
        );
      }
    }
    this.logger.log('Permissions seeded');
  }

  private async seedRoles(): Promise<void> {
    const allPermissions = await this.permissionsRepository.find();

    const adminRole = await this.rolesRepository.findOne({
      where: { name: 'admin' },
      relations: ['permissions'],
    });
    if (!adminRole) {
      await this.rolesRepository.save(
        this.rolesRepository.create({
          name: 'admin',
          description: 'Full system access',
          is_system: true,
          permissions: allPermissions,
        }),
      );
      this.logger.log('Admin role seeded');
    } else {
      adminRole.permissions = allPermissions;
      await this.rolesRepository.save(adminRole);
      this.logger.log('Admin role permissions synced');
    }

    const readPermissions = allPermissions.filter((p) => p.action === 'read');
    const userRole = await this.rolesRepository.findOne({
      where: { name: 'user' },
    });
    if (!userRole) {
      await this.rolesRepository.save(
        this.rolesRepository.create({
          name: 'user',
          description: 'Read-only access',
          is_system: false,
          permissions: readPermissions,
        }),
      );
      this.logger.log('User role seeded');
    }
  }

  private async seedAdminUser(): Promise<void> {
    const email = process.env.SEED_ADMIN_EMAIL || 'admin@otb.com';
    const existing = await this.usersRepository.findOne({
      where: { email },
      relations: ['roles'],
    });
    if (!existing) {
      const passwordHash = await bcrypt.hash(
        process.env.SEED_ADMIN_PASSWORD || 'admin123',
        10,
      );
      const adminRole = await this.rolesRepository.findOne({
        where: { name: 'admin' },
      });
      const user = this.usersRepository.create({
        email,
        password_hash: passwordHash,
        full_name: 'System Administrator',
        role: UserRole.ADMIN,
        roles: adminRole ? [adminRole] : [],
      });
      await this.usersRepository.save(user);
      this.logger.log(`Seeded admin user: ${email}`);
    } else if (!existing.roles?.length) {
      const adminRole = await this.rolesRepository.findOne({
        where: { name: 'admin' },
      });
      if (adminRole) {
        existing.roles = [adminRole];
        await this.usersRepository.save(existing);
        this.logger.log('Assigned admin role to existing admin user');
      }
    }
  }
}
