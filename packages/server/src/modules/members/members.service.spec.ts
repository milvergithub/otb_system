jest.mock('@nestjs/event-emitter', () => ({
  EventEmitter2: class EventEmitter2 {},
}));

import { FindOperator, IsNull, Not } from 'typeorm';
import { MembersService } from './members.service';
import { ROLES_KEY } from '../../common/decorators/roles.decorator';
import { MembersController } from './members.controller';
import { AppError } from '../../common/errors/app-error';

const ACTIVE_TYPE = {
  id: 'type-active',
  code: 'ACTIVO',
  name: 'Activo',
  is_active: true,
};
const INACTIVE_TYPE = {
  id: 'type-inactive',
  code: 'INACTIVO',
  name: 'Inactivo',
  is_active: false,
};

function makeRepos() {
  const membersRepo = {
    findOne: jest.fn(),
    findOneBy: jest.fn(),
    findAndCount: jest.fn(),
    find: jest.fn(),
    create: jest.fn((v) => ({ ...v })),
    save: jest.fn(async (v) => ({ id: v.id ?? 'member-new', ...v })),
    remove: jest.fn(async (v) => v),
    softDelete: jest.fn(),
    restore: jest.fn(),
  };
  const memberTypeRepo = {
    findOneBy: jest.fn(),
    find: jest.fn(),
  };
  const eventEmitter = { emit: jest.fn() };
  const service = new MembersService(
    membersRepo as never,
    memberTypeRepo as never,
    eventEmitter as never,
  );
  return { service, membersRepo, memberTypeRepo, eventEmitter };
}

const BASE_MEMBER = {
  id: 'member-1',
  ci: '1234567',
  first_name: 'Juan',
  last_name: 'Perez',
  phone: null,
  phone_country: 'BO',
  address: null,
  member_type_id: null,
  member_type: null,
};

const CREATE_DTO = {
  ci: '1234567',
  firstName: 'Juan',
  lastName: 'Perez',
};

describe('MembersService create with member type', () => {
  it('creates a member with a valid active type', async () => {
    const { service, membersRepo, memberTypeRepo } = makeRepos();
    membersRepo.findOne.mockResolvedValue(null);
    memberTypeRepo.findOneBy.mockResolvedValue(ACTIVE_TYPE);

    await service.create({ ...CREATE_DTO, memberTypeId: ACTIVE_TYPE.id });

    expect(membersRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        member_type_id: 'type-active',
        member_type: ACTIVE_TYPE,
      }),
    );
  });

  it('creates a member without a type', async () => {
    const { service, membersRepo, memberTypeRepo } = makeRepos();
    membersRepo.findOne.mockResolvedValue(null);

    await service.create(CREATE_DTO);

    expect(memberTypeRepo.findOneBy).not.toHaveBeenCalled();
    expect(membersRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        member_type_id: null,
        member_type: null,
      }),
    );
  });

  it('rejects assigning a nonexistent type', async () => {
    const { service, membersRepo, memberTypeRepo } = makeRepos();
    membersRepo.findOne.mockResolvedValue(null);
    memberTypeRepo.findOneBy.mockResolvedValue(null);

    await expect(
      service.create({ ...CREATE_DTO, memberTypeId: 'missing' }),
    ).rejects.toThrow(new AppError('MEMBER_TYPE_NOT_FOUND'));
  });

  it('rejects assigning an inactive type', async () => {
    const { service, memberTypeRepo } = makeRepos();
    memberTypeRepo.findOneBy.mockResolvedValue(INACTIVE_TYPE);

    await expect(
      service.create({ ...CREATE_DTO, memberTypeId: INACTIVE_TYPE.id }),
    ).rejects.toThrow(new AppError('MEMBER_TYPE_INACTIVE'));
  });
});

describe('MembersService update with member type', () => {
  it('keeps the current classification when not part of the update', async () => {
    const { service, membersRepo, memberTypeRepo } = makeRepos();
    membersRepo.findOne.mockResolvedValue({
      ...BASE_MEMBER,
      member_type_id: 'type-active',
      member_type: ACTIVE_TYPE,
    });

    await service.update('member-1', { firstName: 'Pedro' });

    expect(memberTypeRepo.findOneBy).not.toHaveBeenCalled();
    expect(membersRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        member_type_id: 'type-active',
        member_type: ACTIVE_TYPE,
      }),
    );
  });

  it('changes the classification to a valid active type', async () => {
    const { service, membersRepo, memberTypeRepo } = makeRepos();
    const another = { ...ACTIVE_TYPE, id: 'type-2', code: 'OTRO' };
    membersRepo.findOne.mockResolvedValue({
      ...BASE_MEMBER,
      member_type_id: null,
      member_type: null,
    });
    memberTypeRepo.findOneBy.mockResolvedValue(another);

    await service.update('member-1', { memberTypeId: 'type-2' });

    expect(membersRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        member_type_id: 'type-2',
        member_type: another,
      }),
    );
  });

  it('clears the classification when memberTypeId is null', async () => {
    const { service, membersRepo, memberTypeRepo } = makeRepos();
    membersRepo.findOne.mockResolvedValue({
      ...BASE_MEMBER,
      member_type_id: 'type-active',
      member_type: ACTIVE_TYPE,
    });

    await service.update('member-1', { memberTypeId: null });

    expect(memberTypeRepo.findOneBy).not.toHaveBeenCalled();
    expect(membersRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        member_type_id: null,
        member_type: null,
      }),
    );
  });

  it('rejects updating to an inactive type', async () => {
    const { service, membersRepo, memberTypeRepo } = makeRepos();
    membersRepo.findOne.mockResolvedValue(BASE_MEMBER);
    memberTypeRepo.findOneBy.mockResolvedValue(INACTIVE_TYPE);

    await expect(
      service.update('member-1', { memberTypeId: INACTIVE_TYPE.id }),
    ).rejects.toThrow(new AppError('MEMBER_TYPE_INACTIVE'));
  });
});

describe('MembersService filtering by member type', () => {
  it('filters by a specific member type', async () => {
    const { service, membersRepo } = makeRepos();
    membersRepo.findAndCount.mockResolvedValue([
      [{ ...BASE_MEMBER, member_type: ACTIVE_TYPE }],
      1,
    ]);

    const result = await service.findAll(
      { page: 1, limit: 10 } as never,
      undefined,
      'type-active',
    );

    const arg = membersRepo.findAndCount.mock.calls[0][0] as {
      where: Record<string, unknown>[];
      withDeleted: boolean;
    };
    expect(arg.where[0].member_type_id).toBe('type-active');
    expect(arg.withDeleted).toBe(false);
    expect(result.items).toHaveLength(1);
  });

  it('filters unassigned members with the none marker', async () => {
    const { service, membersRepo } = makeRepos();
    membersRepo.findAndCount.mockResolvedValue([[BASE_MEMBER], 1]);

    await service.findAll({ page: 1, limit: 10 } as never, undefined, 'none');

    const arg = membersRepo.findAndCount.mock.calls[0][0] as {
      where: Record<string, unknown>[];
    };
    expect(arg.where[0].member_type_id).toBeInstanceOf(Object);
  });

  it('lists members without a type when no filter is applied', async () => {
    const { service, membersRepo } = makeRepos();
    membersRepo.findAndCount.mockResolvedValue([[BASE_MEMBER], 1]);

    const result = await service.findAll({ page: 1, limit: 10 } as never);

    const arg = membersRepo.findAndCount.mock.calls[0][0] as {
      where: Record<string, unknown>[];
      withDeleted: boolean;
    };
    expect(arg.where[0].member_type_id).toBeUndefined();
    expect(arg.withDeleted).toBe(false);
    expect(result.total).toBe(1);
    expect(result.items[0].member_type).toBeNull();
  });
});

describe('MembersService soft delete status', () => {
  function whereOf(membersRepo: {
    findAndCount: jest.Mock;
  }): Record<string, unknown> {
    return (
      membersRepo.findAndCount.mock.calls[0][0] as {
        where: Record<string, unknown>[];
      }
    ).where[0];
  }

  it('defaults to active members only', async () => {
    const { service, membersRepo } = makeRepos();
    membersRepo.findAndCount.mockResolvedValue([[BASE_MEMBER], 1]);

    await service.findAll({ page: 1, limit: 10 } as never);

    const arg = membersRepo.findAndCount.mock.calls[0][0] as {
      withDeleted: boolean;
    };
    expect(arg.withDeleted).toBe(false);
    expect(whereOf(membersRepo).deleted_at).toBeInstanceOf(FindOperator);
    expect(
      (whereOf(membersRepo).deleted_at as FindOperator<unknown>).type,
    ).toBe('isNull');
  });

  it('lists softly deleted members when status is deleted', async () => {
    const { service, membersRepo } = makeRepos();
    const deleted = { ...BASE_MEMBER, deleted_at: new Date() };
    membersRepo.findAndCount.mockResolvedValue([[deleted], 1]);

    const result = await service.findAll(
      { page: 1, limit: 10 } as never,
      undefined,
      undefined,
      'deleted',
    );

    const arg = membersRepo.findAndCount.mock.calls[0][0] as {
      withDeleted: boolean;
    };
    expect(arg.withDeleted).toBe(true);
    expect(whereOf(membersRepo).deleted_at).toBeInstanceOf(FindOperator);
    expect(
      (whereOf(membersRepo).deleted_at as FindOperator<unknown>).type,
    ).toBe('not');
    expect(result.items[0].deleted_at).toBe(deleted.deleted_at);
  });

  it('returns active and deleted members for status all', async () => {
    const { service, membersRepo } = makeRepos();
    membersRepo.findAndCount.mockResolvedValue([[BASE_MEMBER], 1]);

    await service.findAll(
      { page: 1, limit: 10 } as never,
      undefined,
      undefined,
      'all',
    );

    const arg = membersRepo.findAndCount.mock.calls[0][0] as {
      withDeleted: boolean;
    };
    expect(arg.withDeleted).toBe(true);
    expect(whereOf(membersRepo).deleted_at).toBeUndefined();
  });
});

describe('MembersService remove (soft delete)', () => {
  it('soft-deletes an existing active member', async () => {
    const { service, membersRepo } = makeRepos();
    membersRepo.findOne.mockResolvedValue({ ...BASE_MEMBER, deleted_at: null });

    await service.remove('member-1');

    expect(membersRepo.findOne).toHaveBeenCalledWith(
      expect.objectContaining({ withDeleted: true }),
    );
    expect(membersRepo.softDelete).toHaveBeenCalledWith('member-1');
  });

  it('throws when the member does not exist', async () => {
    const { service, membersRepo } = makeRepos();
    membersRepo.findOne.mockResolvedValue(null);

    await expect(service.remove('missing')).rejects.toThrow(
      new AppError('MEMBER_NOT_FOUND'),
    );
    expect(membersRepo.softDelete).not.toHaveBeenCalled();
  });

  it('throws MEMBER_ALREADY_DELETED when removing a deleted member', async () => {
    const { service, membersRepo } = makeRepos();
    membersRepo.findOne.mockResolvedValue({
      ...BASE_MEMBER,
      deleted_at: new Date(),
    });

    await expect(service.remove('member-1')).rejects.toThrow(
      new AppError('MEMBER_ALREADY_DELETED'),
    );
    expect(membersRepo.softDelete).not.toHaveBeenCalled();
  });
});

describe('MembersService restore', () => {
  it('restores a deleted member and reloads it', async () => {
    const { service, membersRepo } = makeRepos();
    const restored = { ...BASE_MEMBER, deleted_at: null };
    membersRepo.findOne.mockResolvedValueOnce({
      ...BASE_MEMBER,
      deleted_at: new Date(),
    });
    membersRepo.findOne.mockResolvedValueOnce(null); // no CI conflict
    membersRepo.findOne.mockResolvedValueOnce(restored);

    const result = await service.restore('member-1');

    expect(membersRepo.restore).toHaveBeenCalledWith('member-1');
    expect(result).toBe(restored);
  });

  it('throws MEMBER_NOT_FOUND for an unknown member', async () => {
    const { service, membersRepo } = makeRepos();
    membersRepo.findOne.mockResolvedValueOnce(null);

    await expect(service.restore('missing')).rejects.toThrow(
      new AppError('MEMBER_NOT_FOUND'),
    );
    expect(membersRepo.restore).not.toHaveBeenCalled();
  });

  it('throws MEMBER_NOT_DELETED when the member is active', async () => {
    const { service, membersRepo } = makeRepos();
    membersRepo.findOne.mockResolvedValueOnce({
      ...BASE_MEMBER,
      deleted_at: null,
    });

    await expect(service.restore('member-1')).rejects.toThrow(
      new AppError('MEMBER_NOT_DELETED'),
    );
    expect(membersRepo.restore).not.toHaveBeenCalled();
  });

  it('throws MEMBER_CI_EXISTS when the CI is held by another active member', async () => {
    const { service, membersRepo } = makeRepos();
    membersRepo.findOne.mockResolvedValueOnce({
      ...BASE_MEMBER,
      deleted_at: new Date(),
    });
    membersRepo.findOne.mockResolvedValueOnce({
      ...BASE_MEMBER,
      id: 'member-2',
    });

    await expect(service.restore('member-1')).rejects.toThrow(
      new AppError('MEMBER_CI_EXISTS'),
    );
    expect(membersRepo.restore).not.toHaveBeenCalled();
  });
});

describe('MembersService create/update CI uniqueness over deleted rows', () => {
  it('create checks the CI with withDeleted so a deleted member still owns it', async () => {
    const { service, membersRepo } = makeRepos();
    membersRepo.findOne.mockResolvedValue({ ...BASE_MEMBER, deleted_at: null });

    await expect(service.create(CREATE_DTO)).rejects.toThrow(
      new AppError('MEMBER_CI_EXISTS'),
    );
    expect(membersRepo.findOne).toHaveBeenCalledWith(
      expect.objectContaining({ withDeleted: true }),
    );
  });

  it('update checks the CI with withDeleted when it changes', async () => {
    const { service, membersRepo } = makeRepos();
    membersRepo.findOne.mockResolvedValueOnce(BASE_MEMBER);
    membersRepo.findOne.mockResolvedValueOnce({
      ...BASE_MEMBER,
      id: 'member-2',
    });

    await expect(service.update('member-1', { ci: '9999999' })).rejects.toThrow(
      new AppError('MEMBER_CI_EXISTS'),
    );
    expect(membersRepo.findOne).toHaveBeenLastCalledWith(
      expect.objectContaining({ withDeleted: true }),
    );
  });

  it('create succeeds when the CI is free even across deleted rows', async () => {
    const { service, membersRepo } = makeRepos();
    membersRepo.findOne.mockResolvedValue(null);

    await service.create(CREATE_DTO);

    expect(membersRepo.findOne).toHaveBeenCalledWith(
      expect.objectContaining({ withDeleted: true }),
    );
    expect(membersRepo.save).toHaveBeenCalled();
  });
});

describe('MembersController permissions', () => {
  const controller = MembersController.prototype;

  it('protects member endpoints with the members permissions', () => {
    expect(Reflect.getMetadata(ROLES_KEY, controller.findAll)).toEqual([
      'members.read',
    ]);
    expect(Reflect.getMetadata(ROLES_KEY, controller.findAllForSelect)).toEqual(
      ['members.read'],
    );
    expect(Reflect.getMetadata(ROLES_KEY, controller.findOne)).toEqual([
      'members.read',
    ]);
    expect(Reflect.getMetadata(ROLES_KEY, controller.create)).toEqual([
      'members.create',
    ]);
    expect(Reflect.getMetadata(ROLES_KEY, controller.update)).toEqual([
      'members.update',
    ]);
    expect(Reflect.getMetadata(ROLES_KEY, controller.remove)).toEqual([
      'members.delete',
    ]);
    expect(Reflect.getMetadata(ROLES_KEY, controller.restore)).toEqual([
      'members.delete',
    ]);
  });
});

describe('MembersController deleted-members gate', () => {
  function makeController() {
    const service = {
      findAll: jest.fn(async () => ({
        items: [],
        total: 0,
        page: 1,
        limit: 10,
        totalPages: 0,
      })),
      restore: jest.fn(async (id) => ({ id, deleted_at: null })),
    };
    const controller = new MembersController(service as never);
    return { controller, service };
  }

  it('allows the default status without the members.delete permission', async () => {
    const { controller, service } = makeController();

    await controller.findAll(
      { page: 1, limit: 10 } as never,
      undefined,
      undefined,
      undefined,
      { permissions: ['members.read'] } as never,
    );

    expect(service.findAll).toHaveBeenCalledWith(
      { page: 1, limit: 10 } as never,
      undefined,
      undefined,
      'active',
    );
  });

  it('rejects a deleted status without members.delete', async () => {
    const { controller, service } = makeController();

    expect(() =>
      controller.findAll(
        { page: 1, limit: 10 } as never,
        undefined,
        undefined,
        'deleted',
        { permissions: ['members.read'] } as never,
      ),
    ).toThrow(new AppError('INSUFFICIENT_PERMISSIONS'));
    expect(service.findAll).not.toHaveBeenCalled();
  });

  it('rejects the all status without members.delete', async () => {
    const { controller, service } = makeController();

    expect(() =>
      controller.findAll(
        { page: 1, limit: 10 } as never,
        undefined,
        undefined,
        'all',
        { permissions: ['members.read'] } as never,
      ),
    ).toThrow(new AppError('INSUFFICIENT_PERMISSIONS'));
    expect(service.findAll).not.toHaveBeenCalled();
  });

  it('passes the status through when the user has members.delete', async () => {
    const { controller, service } = makeController();

    await controller.findAll(
      { page: 1, limit: 10 } as never,
      undefined,
      undefined,
      'deleted',
      { permissions: ['members.read', 'members.delete'] } as never,
    );

    expect(service.findAll).toHaveBeenCalledWith(
      { page: 1, limit: 10 } as never,
      undefined,
      undefined,
      'deleted',
    );
  });

  it('ignores an unknown status value', async () => {
    const { controller, service } = makeController();

    await controller.findAll(
      { page: 1, limit: 10 } as never,
      undefined,
      undefined,
      'bogus' as never,
      { permissions: ['members.read'] } as never,
    );

    expect(service.findAll).toHaveBeenCalledWith(
      { page: 1, limit: 10 } as never,
      undefined,
      undefined,
      'active',
    );
  });

  it('delegates the restore action', async () => {
    const { controller, service } = makeController();

    const result = await controller.restore('member-1');

    expect(service.restore).toHaveBeenCalledWith('member-1');
    expect(result.id).toBe('member-1');
  });
});

describe('MembersService importCsv welcome emission', () => {
  const HEADER =
    'ci,first_name,last_name,phone,phone_country,address,member_type';

  function csv(rows: string[]) {
    return [HEADER, ...rows].join('\n');
  }

  function row(ci: string, phone = '', firstName = 'Juan', lastName = 'Perez') {
    return `${ci},${firstName},${lastName},${phone},BO,,`;
  }

  async function runImport(
    rows: string[],
    {
      sendWelcome,
      findOne = null,
    }: { sendWelcome?: boolean; findOne?: unknown } = {},
  ) {
    const { service, membersRepo, memberTypeRepo, eventEmitter } = makeRepos();
    membersRepo.findOne.mockResolvedValue(findOne);
    memberTypeRepo.find.mockResolvedValue([]);
    await service.importCsv(
      csv(rows),
      sendWelcome === undefined ? false : sendWelcome,
    );
    return { membersRepo, eventEmitter };
  }

  it('emits member.created for each row with a phone when sendWelcome is true', async () => {
    const { eventEmitter } = await runImport(
      [row('1', '70000000'), row('2', '71111111')],
      { sendWelcome: true },
    );

    expect(eventEmitter.emit).toHaveBeenCalledTimes(2);
    expect(eventEmitter.emit).toHaveBeenCalledWith(
      'member.created',
      expect.objectContaining({ phone: '70000000' }),
    );
    expect(eventEmitter.emit).toHaveBeenCalledWith(
      'member.created',
      expect.objectContaining({
        phone: '71111111',
        fullName: 'Juan Perez',
      }),
    );
  });

  it('does not emit when sendWelcome is false or absent', async () => {
    const { eventEmitter } = await runImport(
      [row('1', '70000000'), row('2', '71111111')],
      { sendWelcome: false },
    );

    expect(eventEmitter.emit).not.toHaveBeenCalled();
  });

  it(
    'never emits for imports over ' + 20 + ' rows even when requested',
    async () => {
      const many = Array.from({ length: 21 }, (_, i) =>
        row(String(i + 1), `7${i}`),
      );
      const { eventEmitter } = await runImport(many, { sendWelcome: true });

      expect(eventEmitter.emit).not.toHaveBeenCalled();
    },
  );

  it('does not emit for rows without a phone', async () => {
    const { eventEmitter } = await runImport([row('1'), row('2', '71111111')], {
      sendWelcome: true,
    });

    expect(eventEmitter.emit).toHaveBeenCalledTimes(1);
    expect(eventEmitter.emit).toHaveBeenCalledWith(
      'member.created',
      expect.objectContaining({ phone: '71111111' }),
    );
  });
});
