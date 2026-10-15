import { SurchargeService } from './surcharge.service';
import { Surcharge, SurchargeType } from './entities/surcharge.entity';

function makeSurcharge(partial: Partial<Surcharge> = {}): Surcharge {
  return {
    id: 's1',
    name: 'Mora fija',
    type: SurchargeType.FIXED,
    value: '10',
    description: undefined,
    is_active: true,
    is_default: false,
    created_at: new Date(),
    updated_at: new Date(),
    ...partial,
  } as Surcharge;
}

function makeService(overrides: Partial<Record<string, jest.Mock>> = {}): {
  service: SurchargeService;
  repository: Record<string, jest.Mock>;
} {
  const repository: Record<string, jest.Mock> = {
    find: jest.fn(async () => []),
    findOne: jest.fn(async () => null),
    create: jest.fn((data: unknown) => data),
    save: jest.fn(async (data: unknown) => data),
    update: jest.fn(),
    remove: jest.fn(async () => undefined),
    ...overrides,
  };
  const service = new SurchargeService(repository as never);
  return { service, repository };
}

describe('SurchargeService.findDefaults', () => {
  it('returns only surcharges that are both default and active', async () => {
    const defaults = [makeSurcharge({ is_default: true })];
    const { service, repository } = makeService({
      find: jest.fn(async () => defaults),
    });

    const result = await service.findDefaults();

    expect(repository.find).toHaveBeenCalledWith({
      where: { is_default: true, is_active: true },
      order: { name: 'ASC' },
    });
    expect(result).toBe(defaults);
  });
});

describe('SurchargeService is_default handling', () => {
  it('create persists is_default without clearing other surcharges', async () => {
    const { service, repository } = makeService();

    await service.create({ name: 'Mora 2', value: 5, is_default: true });

    expect(repository.save).toHaveBeenCalledWith(
      expect.objectContaining({ is_default: true, is_active: true }),
    );
    expect(repository.update).not.toHaveBeenCalled();
  });

  it('create defaults is_default to false', async () => {
    const { service, repository } = makeService();

    await service.create({ name: 'Mora 3', value: 5 });

    expect(repository.save).toHaveBeenCalledWith(
      expect.objectContaining({ is_default: false }),
    );
  });

  it('update toggles is_default on the row itself without touching others', async () => {
    const { service, repository } = makeService({
      findOne: jest.fn(async () => makeSurcharge()),
    });

    await service.update('s1', { is_default: true });

    expect(repository.save).toHaveBeenCalledWith(
      expect.objectContaining({ id: 's1', is_default: true }),
    );
    expect(repository.update).not.toHaveBeenCalled();
  });
});

describe('SurchargeService.calculateSurchargeAmount', () => {
  it('uses the fixed value directly, without multiplying by months', () => {
    const service = makeService().service;
    const surcharge = makeSurcharge({ type: SurchargeType.FIXED, value: '10' });

    expect(service.calculateSurchargeAmount(30, surcharge)).toBe(10);
  });

  it('calculates percentages over the bill amount', () => {
    const service = makeService().service;
    const surcharge = makeSurcharge({
      type: SurchargeType.PERCENTAGE,
      value: '2',
    });

    expect(service.calculateSurchargeAmount(30, surcharge)).toBeCloseTo(0.6);
  });

  it('never returns a negative amount', () => {
    const service = makeService().service;
    const surcharge = makeSurcharge({
      type: SurchargeType.PERCENTAGE,
      value: '2',
    });

    expect(service.calculateSurchargeAmount(-10, surcharge)).toBe(0);
  });
});
