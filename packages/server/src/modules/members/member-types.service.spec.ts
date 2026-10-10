import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { MemberTypesService } from './member-types.service';
import { CreateMemberTypeDto } from './dto/member-type.dto';
import { ROLES_KEY } from '../../common/decorators/roles.decorator';
import { MemberTypesController } from './member-types.controller';
import { AppError } from '../../common/errors/app-error';

function makeRepos() {
  const memberTypeRepo = {
    createQueryBuilder: jest.fn(),
    findOneBy: jest.fn(),
    create: jest.fn((v) => ({ ...v })),
    save: jest.fn(async (v) => ({ id: v.id ?? 'type-new', ...v })),
    remove: jest.fn(async (v) => v),
  };
  const membersRepo = {
    createQueryBuilder: jest.fn(),
    count: jest.fn(),
  };
  const service = new MemberTypesService(
    memberTypeRepo as never,
    membersRepo as never,
  );
  return { service, memberTypeRepo, membersRepo };
}

const VALID_DTO: CreateMemberTypeDto = {
  code: 'residencial',
  name: 'Residencial',
  description: 'Vivienda familiar',
};

describe('MemberTypesService create', () => {
  it('creates a valid type normalising the code to uppercase', async () => {
    const { service, memberTypeRepo } = makeRepos();
    memberTypeRepo.findOneBy.mockResolvedValue(null);

    const created = await service.create(VALID_DTO);

    expect(memberTypeRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({
        code: 'RESIDENCIAL',
        name: 'Residencial',
        description: 'Vivienda familiar',
        is_active: true,
        sort_order: 0,
      }),
    );
    expect(created.code).toBe('RESIDENCIAL');
  });

  it('rejects an empty name', async () => {
    const { service, memberTypeRepo } = makeRepos();
    memberTypeRepo.findOneBy.mockResolvedValue(null);

    await expect(service.create({ ...VALID_DTO, name: '   ' })).rejects.toThrow(
      new AppError('MEMBER_TYPE_NAME_REQUIRED'),
    );
  });

  it('rejects an empty code', async () => {
    const { service, memberTypeRepo } = makeRepos();
    memberTypeRepo.findOneBy.mockResolvedValue(null);

    await expect(service.create({ ...VALID_DTO, code: '' })).rejects.toThrow(
      new AppError('MEMBER_TYPE_CODE_REQUIRED'),
    );
  });

  it('rejects an invalid create payload at the DTO level', async () => {
    const dto = plainToInstance(CreateMemberTypeDto, {
      code: '',
      name: '',
      sortOrder: -1,
    });
    const errors = await validate(dto);
    const fields = errors.map((e) => e.property);
    expect(fields).toEqual(
      expect.arrayContaining(['code', 'name', 'sortOrder']),
    );
  });

  it('rejects a duplicated code', async () => {
    const { service, memberTypeRepo } = makeRepos();
    memberTypeRepo.findOneBy.mockResolvedValue({
      id: 'other',
      code: 'RESIDENCIAL',
    });

    await expect(service.create(VALID_DTO)).rejects.toThrow(
      new AppError('MEMBER_TYPE_CODE_EXISTS'),
    );
  });

  it('rejects a duplicated name', async () => {
    const { service, memberTypeRepo } = makeRepos();
    memberTypeRepo.findOneBy
      .mockResolvedValueOnce(null) // code check
      .mockResolvedValueOnce({ id: 'other', name: 'Residencial' }); // name check

    await expect(service.create(VALID_DTO)).rejects.toThrow(
      new AppError('MEMBER_TYPE_NAME_EXISTS'),
    );
  });
});

describe('MemberTypesService update and status', () => {
  it('updates an existing type', async () => {
    const { service, memberTypeRepo } = makeRepos();
    const existing = {
      id: 'type-1',
      code: 'RESIDENCIAL',
      name: 'Residencial',
      description: null,
      is_active: true,
      sort_order: 0,
    };
    memberTypeRepo.findOneBy.mockResolvedValue(existing);

    const updated = await service.update('type-1', {
      name: 'Residencial nuevo',
      description: 'Actualizado',
    });

    expect(updated.name).toBe('Residencial nuevo');
    expect(updated.description).toBe('Actualizado');
    expect(memberTypeRepo.save).toHaveBeenCalled();
  });

  it('deactivates and reactivates a type', async () => {
    const { service, memberTypeRepo } = makeRepos();
    const existing = {
      id: 'type-1',
      code: 'RESIDENCIAL',
      name: 'Residencial',
      is_active: true,
    };
    memberTypeRepo.findOneBy.mockResolvedValue(existing);

    const deactivated = await service.setStatus('type-1', false);
    expect(deactivated.is_active).toBe(false);
    expect(memberTypeRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({ is_active: false }),
    );

    const reactivated = await service.setStatus('type-1', true);
    expect(reactivated.is_active).toBe(true);
  });

  it('throws when updating an unknown type', async () => {
    const { service, memberTypeRepo } = makeRepos();
    memberTypeRepo.findOneBy.mockResolvedValue(null);

    await expect(service.update('nope', { name: 'X' })).rejects.toThrow(
      new AppError('MEMBER_TYPE_NOT_FOUND'),
    );
  });
});

describe('MemberTypesService remove', () => {
  it('refuses to delete a type that is still assigned to members', async () => {
    const { service, memberTypeRepo, membersRepo } = makeRepos();
    memberTypeRepo.findOneBy.mockResolvedValue({
      id: 'type-1',
      code: 'RESIDENCIAL',
    });
    membersRepo.count.mockResolvedValue(3);

    await expect(service.remove('type-1')).rejects.toThrow(
      new AppError('MEMBER_TYPE_IN_USE'),
    );
    expect(memberTypeRepo.remove).not.toHaveBeenCalled();
  });

  it('deletes a type with no assigned members', async () => {
    const { service, memberTypeRepo, membersRepo } = makeRepos();
    memberTypeRepo.findOneBy.mockResolvedValue({
      id: 'type-1',
      code: 'RESIDENCIAL',
    });
    membersRepo.count.mockResolvedValue(0);

    await service.remove('type-1');

    expect(memberTypeRepo.remove).toHaveBeenCalled();
  });
});

describe('MemberTypesController permissions', () => {
  const controller = MemberTypesController.prototype;

  it('protects every endpoint with the memberTypes permissions', () => {
    expect(Reflect.getMetadata(ROLES_KEY, controller.findAll)).toEqual([
      'memberTypes.read',
    ]);
    expect(Reflect.getMetadata(ROLES_KEY, controller.findOne)).toEqual([
      'memberTypes.read',
    ]);
    expect(Reflect.getMetadata(ROLES_KEY, controller.create)).toEqual([
      'memberTypes.create',
    ]);
    expect(Reflect.getMetadata(ROLES_KEY, controller.update)).toEqual([
      'memberTypes.update',
    ]);
    expect(Reflect.getMetadata(ROLES_KEY, controller.setStatus)).toEqual([
      'memberTypes.update',
    ]);
    expect(Reflect.getMetadata(ROLES_KEY, controller.remove)).toEqual([
      'memberTypes.delete',
    ]);
  });
});
