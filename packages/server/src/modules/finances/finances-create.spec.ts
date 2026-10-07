import { ForbiddenException } from '@nestjs/common';
import { FinancesService, FinanceAccess } from './finances.service';
import { CreateFinanceTransactionDto } from './dto/finance-transaction.dto';
import { FinanceTransactionType } from './entities/finance-transaction.entity';
import type { FinanceTransaction } from './entities/finance-transaction.entity';

type Repo = {
  create: jest.Mock;
  save: jest.Mock;
  findOne: jest.Mock;
};

function makeRepos(): Repo {
  return {
    create: jest.fn((data: Partial<FinanceTransaction>) => ({ ...data })),
    save: jest.fn((tx: FinanceTransaction) => Promise.resolve(tx)),
    findOne: jest.fn().mockResolvedValue(null),
  };
}

function makeService(transactionsRepo: Repo = makeRepos()) {
  const noop = {} as never;
  const service = new FinancesService(
    transactionsRepo as never,
    noop, // categoriesRepo
    noop, // documentsRepo
    noop, // membersRepo
    noop, // usersRepo
    noop, // assetsRepo
    noop, // activitiesRepo
    noop, // paymentsRepo
    noop, // consumptionsRepo
    noop, // storageService
  );
  return { service, transactionsRepo };
}

function baseDto(
  overrides: Partial<CreateFinanceTransactionDto> = {},
): CreateFinanceTransactionDto {
  return {
    type: FinanceTransactionType.INCOME,
    date: '2026-01-15',
    amount: 100,
    concept: 'Pago manual de prueba',
    ...overrides,
  } as CreateFinanceTransactionDto;
}

const userA: FinanceAccess = { userId: 'user-a', canViewAll: false };
const admin: FinanceAccess = { userId: 'admin-1', canViewAll: true };

describe('FinancesService manual responsibility rules', () => {
  it('rejects assigning another user as responsible without finances.all', async () => {
    const { service } = makeService();
    await expect(
      service.createManual(baseDto({ responsibleUserId: 'user-b' }), userA),
    ).rejects.toThrow(ForbiddenException);
  });

  it('allows taking own responsibility without finances.all', async () => {
    const { service, transactionsRepo } = makeService();
    const tx = await service.createManual(
      baseDto({ responsibleUserId: 'user-a' }),
      userA,
    );
    expect(tx.responsible_user_id).toBe('user-a');
    expect(transactionsRepo.save).toHaveBeenCalledTimes(1);
  });

  it('allows assigning any responsible user with finances.all', async () => {
    const { service } = makeService();
    const tx = await service.createManual(
      baseDto({ responsibleUserId: 'user-b' }),
      admin,
    );
    expect(tx.responsible_user_id).toBe('user-b');
  });

  it('never derives responsibility from the authenticated user', async () => {
    const { service } = makeService();
    const tx = await service.create(baseDto(), 'user-a');
    expect(tx.responsible_user_id).toBeNull();
    expect(tx.registered_by_user_id).toBe('user-a');
  });

  it('keeps registeredByUserId off the request DTO so clients cannot forge it', () => {
    const dto = new CreateFinanceTransactionDto();
    expect('registeredByUserId' in dto).toBe(false);
    // The HTTP layer additionally strips unknown properties (whitelist: true),
    // so only internal callers can inject a different registrant.
    expect(Object.keys(dto)).not.toContain('registeredByUserId');
  });

  it('falls back the collector to the registrant when none is given', async () => {
    const { service } = makeService();
    const tx = await service.create(baseDto(), 'user-a');
    expect(tx.collector_user_id).toBe('user-a');
  });

  it('keeps an explicit collector', async () => {
    const { service } = makeService();
    const tx = await service.create(
      baseDto({ collectorUserId: 'collector-1' }),
      'user-a',
    );
    expect(tx.collector_user_id).toBe('collector-1');
    expect(tx.registered_by_user_id).toBe('user-a');
  });
});

describe('FinancesService update responsibility rules', () => {
  it('rejects reassigning another user as responsible without finances.all', async () => {
    const transactionsRepo = makeRepos();
    transactionsRepo.findOne.mockResolvedValue({
      id: 'tx-1',
      responsible_user_id: 'user-a',
    });
    const { service } = makeService(transactionsRepo);

    await expect(
      service.update(
        'tx-1',
        { responsibleUserId: 'user-b', date: '2026-01-15' } as never,
        userA,
      ),
    ).rejects.toThrow(ForbiddenException);
  });
});
