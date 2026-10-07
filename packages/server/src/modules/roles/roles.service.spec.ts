import { NotFoundException } from '@nestjs/common';
import { RolesService } from './roles.service';
import { UserRole } from '../users/entities/user.entity';

const ADMIN = { id: 'role-admin', name: 'admin' };
const CASHIER = { id: 'role-cashier', name: 'cajero' };

function makeService(user: Record<string, any> | null) {
  const usersRepo = {
    findOne: jest.fn(async () => user),
    save: jest.fn(async (v) => v),
  };
  const rolesRepo = {
    findBy: jest.fn(async ({ id }: any) =>
      [ADMIN, CASHIER].filter((r) => (id._value as string[]).includes(r.id)),
    ),
  };
  const service = new RolesService(
    rolesRepo as never,
    {} as never,
    usersRepo as never,
  );
  return { service, usersRepo };
}

describe('RolesService.assignRolesToUser legacy role sync', () => {
  it('sets role=admin when the admin role is assigned', async () => {
    const { service, usersRepo } = makeService({
      id: 'u1',
      role: UserRole.USER,
      roles: [],
    });
    await service.assignRolesToUser('u1', [ADMIN.id, CASHIER.id]);
    expect(usersRepo.save.mock.calls[0][0].role).toBe(UserRole.ADMIN);
  });

  it('sets role=user when the admin role is removed', async () => {
    const { service, usersRepo } = makeService({
      id: 'u1',
      role: UserRole.ADMIN,
      roles: [ADMIN],
    });
    await service.assignRolesToUser('u1', [CASHIER.id]);
    expect(usersRepo.save.mock.calls[0][0].role).toBe(UserRole.USER);
  });

  it('throws when the user does not exist', async () => {
    const { service } = makeService(null);
    await expect(
      service.assignRolesToUser('missing', [ADMIN.id]),
    ).rejects.toBeInstanceOf(NotFoundException);
  });
});
