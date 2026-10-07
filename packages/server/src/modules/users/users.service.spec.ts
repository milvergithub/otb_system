import { UsersService } from './users.service';
import { UserRole, legacyRoleFromRoles } from './entities/user.entity';

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
  password: 'secret123',
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
