import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { PaymentMethodsService } from './payment-methods.service';
import { CreatePaymentMethodDto } from './dto/payment-method.dto';
import { ROLES_KEY } from '../../common/decorators/roles.decorator';
import { PaymentMethodsController } from './payment-methods.controller';
import { AppError } from '../../common/errors/app-error';

function makeRepos() {
  const paymentMethodsRepo = {
    findOneBy: jest.fn(),
    find: jest.fn(),
    createQueryBuilder: jest.fn(),
    create: jest.fn((v) => ({ ...v })),
    save: jest.fn(async (v) => ({ id: v.id ?? 'pm-new', ...v })),
    remove: jest.fn(async (v) => v),
  };
  const countRepo = { countBy: jest.fn().mockResolvedValue(0) };
  const service = new PaymentMethodsService(
    paymentMethodsRepo as never,
    countRepo as never,
    countRepo as never,
    countRepo as never,
    countRepo as never,
  );
  return { service, paymentMethodsRepo, countRepo };
}

const VALID_DTO: CreatePaymentMethodDto = {
  code: 'cash',
  name: 'Efectivo',
};

describe('PaymentMethodsService create', () => {
  it('creates a valid method normalising the code to lowercase', async () => {
    const { service, paymentMethodsRepo } = makeRepos();
    paymentMethodsRepo.findOneBy.mockResolvedValue(null);

    const created = await service.create({ code: '  CASH ', name: 'Efectivo' });

    expect(paymentMethodsRepo.save).toHaveBeenCalledWith(
      expect.objectContaining({ code: 'cash', name: 'Efectivo' }),
    );
    expect(created.code).toBe('cash');
  });

  it('rejects an empty code', async () => {
    const { service, paymentMethodsRepo } = makeRepos();
    paymentMethodsRepo.findOneBy.mockResolvedValue(null);

    await expect(service.create({ ...VALID_DTO, code: '   ' })).rejects.toThrow(
      new AppError('PAYMENT_METHOD_CODE_REQUIRED'),
    );
  });

  it('rejects a duplicated code', async () => {
    const { service, paymentMethodsRepo } = makeRepos();
    paymentMethodsRepo.findOneBy.mockResolvedValue({
      id: 'other',
      code: 'cash',
    });

    await expect(service.create(VALID_DTO)).rejects.toThrow(
      new AppError('PAYMENT_METHOD_CODE_EXISTS'),
    );
  });

  it('rejects a duplicated name', async () => {
    const { service, paymentMethodsRepo } = makeRepos();
    paymentMethodsRepo.findOneBy
      .mockResolvedValueOnce(null) // code check
      .mockResolvedValueOnce({ id: 'other', name: 'Efectivo' }); // name check

    await expect(service.create(VALID_DTO)).rejects.toThrow(
      new AppError('PAYMENT_METHOD_NAME_EXISTS'),
    );
  });

  it('rejects an invalid create payload at the DTO level', async () => {
    const dto = plainToInstance(CreatePaymentMethodDto, {
      code: '',
      name: 'x'.repeat(51),
    });
    const errors = await validate(dto);
    const fields = errors.map((e) => e.property);
    expect(fields).toEqual(expect.arrayContaining(['code', 'name']));
  });
});

describe('PaymentMethodsService validateCode', () => {
  it('accepts an undefined code (payment methods are optional)', async () => {
    const { service, paymentMethodsRepo } = makeRepos();
    await expect(service.validateCode(undefined)).resolves.toBeUndefined();
    expect(paymentMethodsRepo.findOneBy).not.toHaveBeenCalled();
  });

  it('throws when the code does not exist', async () => {
    const { service, paymentMethodsRepo } = makeRepos();
    paymentMethodsRepo.findOneBy.mockResolvedValue(null);

    await expect(service.validateCode('nope')).rejects.toThrow(
      new AppError('PAYMENT_METHOD_NOT_FOUND', { code: 'nope' }),
    );
  });

  it('resolves when the code exists', async () => {
    const { service, paymentMethodsRepo } = makeRepos();
    paymentMethodsRepo.findOneBy.mockResolvedValue({
      id: 'pm-1',
      code: 'cash',
    });

    await expect(service.validateCode('cash')).resolves.toBeUndefined();
  });
});

describe('PaymentMethodsService remove', () => {
  it('refuses to delete a method referenced by any payment', async () => {
    const { service, paymentMethodsRepo, countRepo } = makeRepos();
    paymentMethodsRepo.findOneBy.mockResolvedValue({
      id: 'pm-1',
      code: 'cash',
    });
    countRepo.countBy.mockResolvedValueOnce(0).mockResolvedValueOnce(2);

    await expect(service.remove('pm-1')).rejects.toThrow(
      new AppError('PAYMENT_METHOD_IN_USE', { code: 'cash' }),
    );
    expect(paymentMethodsRepo.remove).not.toHaveBeenCalled();
  });

  it('deletes a method with no references', async () => {
    const { service, paymentMethodsRepo } = makeRepos();
    paymentMethodsRepo.findOneBy.mockResolvedValue({
      id: 'pm-1',
      code: 'cash',
    });

    await service.remove('pm-1');

    expect(paymentMethodsRepo.remove).toHaveBeenCalled();
  });

  it('throws when removing an unknown method', async () => {
    const { service, paymentMethodsRepo } = makeRepos();
    paymentMethodsRepo.findOneBy.mockResolvedValue(null);

    await expect(service.remove('nope')).rejects.toThrow(
      new AppError('PAYMENT_METHOD_NOT_FOUND'),
    );
  });
});

describe('PaymentMethodsController permissions', () => {
  const controller = PaymentMethodsController.prototype;

  it('protects every endpoint with the payment_methods permissions', () => {
    expect(Reflect.getMetadata(ROLES_KEY, controller.findAll)).toEqual([
      'payment_methods.read',
    ]);
    expect(Reflect.getMetadata(ROLES_KEY, controller.findOne)).toEqual([
      'payment_methods.read',
    ]);
    expect(Reflect.getMetadata(ROLES_KEY, controller.create)).toEqual([
      'payment_methods.create',
    ]);
    expect(Reflect.getMetadata(ROLES_KEY, controller.update)).toEqual([
      'payment_methods.update',
    ]);
    expect(Reflect.getMetadata(ROLES_KEY, controller.remove)).toEqual([
      'payment_methods.delete',
    ]);
  });
});
