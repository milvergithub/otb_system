import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { User, UserRole } from '../users/entities/user.entity';
import { Role } from '../roles/entities/role.entity';
import { Permission } from '../roles/entities/permission.entity';
import { AuthService } from '../auth/auth.service';
import {
  CreateInitialAdminDto,
  PASSWORDS_DO_NOT_MATCH,
} from './dto/create-initial-admin.dto';

export const ADMIN_ROLE_NAME = 'admin';
export const SETUP_ADVISORY_LOCK_KEY = 7_310_001;
export const SETUP_ALREADY_COMPLETED =
  'Initial setup has already been completed';
export const EMAIL_ALREADY_EXISTS = 'Email already exists';

export interface SetupStatus {
  setupCompleted: boolean;
}

@Injectable()
export class SetupService {
  private readonly logger = new Logger(SetupService.name);

  constructor(
    @InjectRepository(User) private readonly usersRepository: Repository<User>,
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly authService: AuthService,
  ) {}

  async getStatus(): Promise<SetupStatus> {
    return { setupCompleted: await this.isConfigured() };
  }

  async isConfigured(): Promise<boolean> {
    return this.hasActiveAdmin(this.usersRepository);
  }

  async createInitialAdmin(dto: CreateInitialAdminDto) {
    if (dto.password !== dto.passwordConfirmation) {
      throw new BadRequestException(PASSWORDS_DO_NOT_MATCH);
    }
    if (await this.isConfigured()) {
      throw new ConflictException(SETUP_ALREADY_COMPLETED);
    }

    const email = dto.email.trim().toLowerCase();
    const fullName = dto.fullName.trim();
    const passwordHash = await bcrypt.hash(dto.password, 10);

    let userId: string;
    try {
      userId = await this.dataSource.transaction(async (manager) => {
        await manager.query('SELECT pg_advisory_xact_lock($1)', [
          SETUP_ADVISORY_LOCK_KEY,
        ]);

        const usersRepo = manager.getRepository(User);
        if (await this.hasActiveAdmin(usersRepo)) {
          throw new ConflictException(SETUP_ALREADY_COMPLETED);
        }
        if (await usersRepo.exists({ where: { email } })) {
          throw new ConflictException(EMAIL_ALREADY_EXISTS);
        }

        const adminRole = await this.resolveAdminRole(manager);
        const user = usersRepo.create({
          email,
          password_hash: passwordHash,
          full_name: fullName,
          role: UserRole.ADMIN,
          is_active: true,
          roles: [adminRole],
        });
        const saved = await usersRepo.save(user);
        return saved.id;
      });
    } catch (error: any) {
      if (error?.driverError?.code === '23505' || error?.code === '23505') {
        throw new ConflictException(EMAIL_ALREADY_EXISTS);
      }
      throw error;
    }

    this.logger.log(`Initial setup completed: administrator ${email} created`);

    const created = await this.usersRepository.findOneOrFail({
      where: { id: userId },
      relations: ['roles'],
    });
    return this.authService.login(created);
  }

  private hasActiveAdmin(repo: Repository<User>): Promise<boolean> {
    return repo
      .createQueryBuilder('user')
      .leftJoin('user.roles', 'role')
      .where('user.is_active = :active', { active: true })
      .andWhere('(role.name = :roleName OR user.role = :legacyRole)', {
        roleName: ADMIN_ROLE_NAME,
        legacyRole: UserRole.ADMIN,
      })
      .getExists();
  }

  private async resolveAdminRole(manager: EntityManager): Promise<Role> {
    const rolesRepo = manager.getRepository(Role);
    const existing = await rolesRepo.findOne({
      where: { name: ADMIN_ROLE_NAME },
    });
    if (existing) return existing;

    const permissions = await manager.getRepository(Permission).find();
    return rolesRepo.save(
      rolesRepo.create({
        name: ADMIN_ROLE_NAME,
        description: 'Full system access',
        is_system: true,
        permissions,
      }),
    );
  }
}
