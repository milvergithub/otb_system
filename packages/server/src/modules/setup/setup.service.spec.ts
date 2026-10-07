import 'reflect-metadata';
import { BadRequestException, ConflictException } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import * as bcrypt from 'bcrypt';
import { UserRole } from '../users/entities/user.entity';
import { CreateInitialAdminDto } from './dto/create-initial-admin.dto';
import {
  ADMIN_ROLE_NAME,
  SETUP_ADVISORY_LOCK_KEY,
  SETUP_ALREADY_COMPLETED,
  SetupService,
} from './setup.service';
import { User } from '../users/entities/user.entity';
import { Role } from '../roles/entities/role.entity';
import { Permission } from '../roles/entities/permission.entity';

type Db = {
  users: Array<Record<string, any>>;
  roles: Array<Record<string, any>>;
};

function isAdmin(u: Record<string, any>) {
  return (
    u.is_active &&
    (u.role === UserRole.ADMIN ||
      (u.roles || []).some((r: any) => r.name === ADMIN_ROLE_NAME))
  );
}

function makeUsersRepo(db: Db) {
  return {
    createQueryBuilder: jest.fn(() => {
      const qb: any = {
        leftJoin: () => qb,
        where: () => qb,
        andWhere: () => qb,
        getExists: jest.fn(async () => db.users.some(isAdmin)),
      };
      return qb;
    }),
    exists: jest.fn(async ({ where }: any) =>
      db.users.some((u) => u.email === where.email),
    ),
    create: jest.fn((v) => v),
    save: jest.fn(async (v) => {
      const saved = { id: `user-${db.users.length + 1}`, ...v };
      db.users.push(saved);
      return saved;
    }),
    findOneOrFail: jest.fn(async ({ where }: any) => {
      const found = db.users.find((u) => u.id === where.id);
      if (!found) throw new Error('not found');
      return found;
    }),
  };
}

function makeService(initial: Partial<Db> = {}) {
  const db: Db = {
    users: initial.users ?? [],
    roles: initial.roles ?? [
      { id: 'role-admin', name: ADMIN_ROLE_NAME, permissions: [] },
    ],
  };
  const usersRepo = makeUsersRepo(db);
  const rolesRepo = {
    findOne: jest.fn(
      async ({ where }: any) =>
        db.roles.find((r) => r.name === where.name) ?? null,
    ),
    create: jest.fn((v) => v),
    save: jest.fn(async (v) => {
      const saved = { id: 'role-new', ...v };
      db.roles.push(saved);
      return saved;
    }),
  };
  const permissionsRepo = { find: jest.fn(async () => []) };

  let lock: Promise<void> = Promise.resolve();
  const query = jest.fn();
  const manager = {
    query,
    getRepository: (entity: unknown) => {
      if (entity === User) return usersRepo;
      if (entity === Role) return rolesRepo;
      if (entity === Permission) return permissionsRepo;
      throw new Error('unexpected repository');
    },
  };
  const dataSource = {
    transaction: jest.fn(async (fn: (m: typeof manager) => Promise<any>) => {
      const previous = lock;
      let release!: () => void;
      lock = new Promise<void>((r) => (release = r));
      await previous;
      try {
        return await fn(manager);
      } finally {
        release();
      }
    }),
  };
  const authService = {
    login: jest.fn(async (user: any) => ({
      user: { id: user.id, email: user.email },
      accessToken: 'access',
      refreshToken: 'refresh',
    })),
  };

  const service = new SetupService(
    usersRepo as never,
    dataSource as never,
    authService as never,
  );
  return { service, db, usersRepo, dataSource, authService, query, rolesRepo };
}

const validDto = (): CreateInitialAdminDto => ({
  fullName: 'Administrador',
  email: 'admin@example.com',
  password: 'secret123',
  passwordConfirmation: 'secret123',
});

describe('SetupService status', () => {
  it('reports setupCompleted=false without an administrator', async () => {
    const { service } = makeService();
    await expect(service.getStatus()).resolves.toEqual({
      setupCompleted: false,
    });
  });

  it('reports setupCompleted=true when an admin role user exists', async () => {
    const { service } = makeService({
      users: [
        {
          id: 'u1',
          is_active: true,
          role: UserRole.USER,
          roles: [{ name: ADMIN_ROLE_NAME }],
        },
      ],
    });
    await expect(service.getStatus()).resolves.toEqual({
      setupCompleted: true,
    });
  });

  it('reports setupCompleted=true for a legacy users.role=admin user', async () => {
    const { service } = makeService({
      users: [{ id: 'u1', is_active: true, role: UserRole.ADMIN, roles: [] }],
    });
    await expect(service.isConfigured()).resolves.toBe(true);
  });
});

describe('SetupService createInitialAdmin', () => {
  it('creates the admin with the admin role and returns a normal session', async () => {
    const { service, db, authService } = makeService();

    const result = await service.createInitialAdmin({
      ...validDto(),
      email: '  Admin@Example.COM ',
    });

    expect(db.users).toHaveLength(1);
    const created = db.users[0];
    expect(created.email).toBe('admin@example.com');
    expect(created.role).toBe(UserRole.ADMIN);
    expect(created.is_active).toBe(true);
    expect(created.roles.map((r: any) => r.name)).toEqual([ADMIN_ROLE_NAME]);
    expect(authService.login).toHaveBeenCalledWith(created);
    expect(result).toEqual(
      expect.objectContaining({
        accessToken: 'access',
        refreshToken: 'refresh',
      }),
    );
  });

  it('never stores the password in plain text', async () => {
    const { service, db } = makeService();
    await service.createInitialAdmin(validDto());

    const created = db.users[0];
    expect(created.password).toBeUndefined();
    expect(created.password_hash).not.toBe('secret123');
    await expect(
      bcrypt.compare('secret123', created.password_hash),
    ).resolves.toBe(true);
  });

  it('takes the advisory lock inside a transaction', async () => {
    const { service, dataSource, query } = makeService();
    await service.createInitialAdmin(validDto());

    expect(dataSource.transaction).toHaveBeenCalledTimes(1);
    expect(query).toHaveBeenCalledWith('SELECT pg_advisory_xact_lock($1)', [
      SETUP_ADVISORY_LOCK_KEY,
    ]);
  });

  it('creates the admin role if it is missing', async () => {
    const { service, db } = makeService({ roles: [] });
    await service.createInitialAdmin(validDto());
    expect(db.roles).toHaveLength(1);
    expect(db.roles[0]).toEqual(
      expect.objectContaining({ name: ADMIN_ROLE_NAME, is_system: true }),
    );
  });

  it('rejects with 409 when setup is already completed', async () => {
    const { service, db } = makeService({
      users: [{ id: 'u1', is_active: true, role: UserRole.ADMIN, roles: [] }],
    });

    await expect(service.createInitialAdmin(validDto())).rejects.toThrow(
      new ConflictException(SETUP_ALREADY_COMPLETED),
    );
    expect(db.users).toHaveLength(1);
  });

  it('rejects mismatched passwords with 400', async () => {
    const { service } = makeService();
    await expect(
      service.createInitialAdmin({
        ...validDto(),
        passwordConfirmation: 'other123',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects a duplicate email with 409', async () => {
    const { service } = makeService({
      users: [
        {
          id: 'u1',
          email: 'admin@example.com',
          is_active: true,
          role: UserRole.USER,
          roles: [],
        },
      ],
    });
    await expect(service.createInitialAdmin(validDto())).rejects.toThrow(
      ConflictException,
    );
  });

  it('maps a unique violation from Postgres to 409', async () => {
    const { service, usersRepo } = makeService();
    usersRepo.save.mockRejectedValueOnce(
      Object.assign(new Error('duplicate'), {
        driverError: { code: '23505' },
      }),
    );
    await expect(service.createInitialAdmin(validDto())).rejects.toThrow(
      ConflictException,
    );
  });

  it('allows only one of two concurrent requests to create an admin', async () => {
    const { service, db } = makeService();

    const results = await Promise.allSettled([
      service.createInitialAdmin(validDto()),
      service.createInitialAdmin({
        ...validDto(),
        email: 'other@example.com',
      }),
    ]);

    const fulfilled = results.filter((r) => r.status === 'fulfilled');
    const rejected = results.filter(
      (r): r is PromiseRejectedResult => r.status === 'rejected',
    );
    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);
    expect(rejected[0].reason).toBeInstanceOf(ConflictException);
    expect(db.users.filter(isAdmin)).toHaveLength(1);
  });
});

describe('CreateInitialAdminDto validation', () => {
  async function errorsFor(payload: Record<string, unknown>) {
    const dto = plainToInstance(CreateInitialAdminDto, payload);
    const errors = await validate(dto);
    return { dto, properties: errors.map((e) => e.property) };
  }

  it('accepts a valid payload and normalizes the email', async () => {
    const { dto, properties } = await errorsFor({
      ...validDto(),
      email: ' Admin@Example.com ',
    });
    expect(properties).toEqual([]);
    expect(dto.email).toBe('admin@example.com');
  });

  it('rejects an invalid email', async () => {
    const { properties } = await errorsFor({ ...validDto(), email: 'nope' });
    expect(properties).toContain('email');
  });

  it('rejects mismatched password confirmation', async () => {
    const { properties } = await errorsFor({
      ...validDto(),
      passwordConfirmation: 'different',
    });
    expect(properties).toContain('passwordConfirmation');
  });

  it('rejects a missing name and short password', async () => {
    const { properties } = await errorsFor({
      ...validDto(),
      fullName: '   ',
      password: '123',
      passwordConfirmation: '123',
    });
    expect(properties).toEqual(
      expect.arrayContaining(['fullName', 'password']),
    );
  });
});
