import * as bcrypt from 'bcrypt';
import { UsersService } from './users.service';
import { UserRole, legacyRoleFromRoles } from './entities/user.entity';
import { checkPasswordStrength } from '../../common/utils/password';

const ADMIN = { id: 'role-admin', name: 'admin' };
const CASHIER = { id: 'role-cashier', name: 'cajero' };
const ALL_ROLES = [ADMIN, CASHIER];

function makeService(existingUser?: Record<string, any>) {
  const usersRepo = {
    findOne: jest.fn(async ({ where }: any) => {
      if (where.email) return null;
      return existingUser ?? null;
    }),
    create: jest.fn((v) => ({ ...v })),
    save: jest.fn(async (v) => ({ id: v.id ?? 'user-1', ...v })),
    update: jest.fn(async (_id: string, patch: Record<string, unknown>) => {
      // Mirrors persistence so the service's re-read sees the new values.
      Object.assign(existingUser ?? {}, patch);
      return { affected: existingUser ? 1 : 0 };
    }),
  };
  const rolesRepo = {
    findBy: jest.fn(async ({ id }: any) =>
      ALL_ROLES.filter((r) => (id._value as string[]).includes(r.id)),
    ),
  };
  const service = new UsersService(usersRepo as never, rolesRepo as never);
  return { service, usersRepo };
}

const baseCreate = {
  email: 'user@example.com',
  fullName: 'Usuario',
};

describe('legacyRoleFromRoles', () => {
  it('maps the admin role to the legacy admin value', () => {
    expect(legacyRoleFromRoles([CASHIER, ADMIN])).toBe(UserRole.ADMIN);
  });

  it('maps any other set of roles to the legacy user value', () => {
    expect(legacyRoleFromRoles([CASHIER])).toBe(UserRole.USER);
    expect(legacyRoleFromRoles([])).toBe(UserRole.USER);
    expect(legacyRoleFromRoles(undefined)).toBe(UserRole.USER);
  });
});

describe('UsersService legacy role sync', () => {
  it('sets role=admin when created with the admin role', async () => {
    const { service, usersRepo } = makeService();
    await service.create({ ...baseCreate, roleIds: [ADMIN.id] });
    expect(usersRepo.save.mock.calls[0][0].role).toBe(UserRole.ADMIN);
  });

  it('sets role=user when created with a non-admin role', async () => {
    const { service, usersRepo } = makeService();
    await service.create({ ...baseCreate, roleIds: [CASHIER.id] });
    expect(usersRepo.save.mock.calls[0][0].role).toBe(UserRole.USER);
  });

  it('sets role=user when created without roles', async () => {
    const { service, usersRepo } = makeService();
    await service.create(baseCreate);
    expect(usersRepo.save.mock.calls[0][0].role).toBe(UserRole.USER);
  });

  it('recomputes the legacy role when roles change on update', async () => {
    const { service, usersRepo } = makeService({
      id: 'u1',
      email: 'user@example.com',
      role: UserRole.USER,
      roles: [CASHIER],
    });
    await service.update('u1', { roleIds: [ADMIN.id] });
    expect(usersRepo.save.mock.calls[0][0].role).toBe(UserRole.ADMIN);
  });

  it('demotes the legacy role when the admin role is removed', async () => {
    const { service, usersRepo } = makeService({
      id: 'u1',
      email: 'user@example.com',
      role: UserRole.ADMIN,
      roles: [ADMIN],
    });
    await service.update('u1', { roleIds: [CASHIER.id] });
    expect(usersRepo.save.mock.calls[0][0].role).toBe(UserRole.USER);
  });

  it('keeps the legacy role when roles are not part of the update', async () => {
    const { service, usersRepo } = makeService({
      id: 'u1',
      email: 'user@example.com',
      role: UserRole.ADMIN,
      roles: [],
    });
    await service.update('u1', { fullName: 'Nuevo nombre' });
    expect(usersRepo.save.mock.calls[0][0].role).toBe(UserRole.ADMIN);
  });
});

describe('UsersService credential handling', () => {
  it('mints a temporary password and forces a change on create', async () => {
    const { service, usersRepo } = makeService();
    const created = await service.create(baseCreate);

    const persisted = usersRepo.save.mock.calls[0][0];
    expect(persisted.must_change_password).toBe(true);
    expect(checkPasswordStrength(created.generatedPassword).valid).toBe(true);
    expect(created).not.toHaveProperty('password_hash');
    await expect(
      bcrypt.compare(created.generatedPassword, persisted.password_hash),
    ).resolves.toBe(true);
  });

  it('replaces the credential and re-arms the forced change on regenerate', async () => {
    const { service, usersRepo } = makeService({
      id: 'u1',
      email: 'user@example.com',
      password_hash: 'old-hash',
      must_change_password: false,
    });

    const result = await service.regeneratePassword('u1');

    expect(usersRepo.update).toHaveBeenCalledWith('u1', {
      password_hash: expect.any(String),
      must_change_password: true,
    });
    expect(result.must_change_password).toBe(true);
    expect(result).not.toHaveProperty('password_hash');
    expect(checkPasswordStrength(result.generatedPassword).valid).toBe(true);
    const persisted = (usersRepo.update.mock.calls[0][1] as any)
      .password_hash as string;
    await expect(
      bcrypt.compare(result.generatedPassword, persisted),
    ).resolves.toBe(true);
  });

  it('reports a missing user when regenerating', async () => {
    const { service } = makeService();
    await expect(service.regeneratePassword('nope')).rejects.toThrow(
      'User not found',
    );
  });

  it('ignores a password sent to update, even from a stale client', async () => {
    const { service, usersRepo } = makeService({
      id: 'u1',
      email: 'user@example.com',
      password_hash: 'original-hash',
      roles: [CASHIER],
    });

    const updated = await service.update('u1', {
      password: 'attacker-chosen',
    } as never);

    expect(usersRepo.save.mock.calls[0][0].password_hash).toBe('original-hash');
    expect(updated).not.toHaveProperty('password_hash');
  });
});
