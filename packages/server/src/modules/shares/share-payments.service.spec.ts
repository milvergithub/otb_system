import type { EntityManager } from 'typeorm';

jest.mock('@nestjs/event-emitter', () => ({
  EventEmitter2: class EventEmitter2 {},
}));

import { SharePaymentsService } from './share-payments.service';
import { FinancialResponsibilityService } from '../finances/financial-responsibility.service';
import { FinancesService } from '../finances/finances.service';
import { FinanceSourceType } from '../finances/entities/finance-transaction.entity';
import { PaymentMethod } from '../billing/entities/payment-history.entity';
import type { SharePayment } from './entities/share-payment.entity';

function makeManager() {
  const saved: Record<string, unknown>[] = [];
  const manager = {
    getRepository: jest.fn(() => ({
      create: jest.fn((data: Record<string, unknown>) => ({ ...data })),
      save: jest.fn(async (data: Record<string, unknown> & { id?: string }) => {
        const row = { ...data, id: data.id ?? 'payment-1' };
        saved.push(row);
        return row;
      }),
    })),
    __saved: saved,
  };
  return manager;
}

function makeService(
  overrides: {
    memberId?: string | null;
    settings?: Record<string, string>;
  } = {},
) {
  const financesService = {
    validateMovement: jest.fn().mockResolvedValue(undefined),
    recordIncome: jest.fn().mockResolvedValue(null),
  };
  const settings: Record<string, string> = {
    water_share_responsible_user_id: 'responsible-1',
    ...overrides.settings,
  };
  const responsibility = new FinancialResponsibilityService({
    getValue: jest.fn(async (key: string) => settings[key]),
  } as never);
  const metersRepository = {
    findOne: jest.fn(async () => ({
      id: 'meter-1',
      member: { id: overrides.memberId ?? 'member-1' },
    })),
  };
  const sharesService = {
    getActiveForDate: jest.fn(async () => ({
      id: 'share-1',
      name: 'Acción 2026',
      amount: '3000',
    })),
  };
  const service = new SharePaymentsService(
    {} as never,
    metersRepository as never,
    sharesService as never,
    {} as never,
    {} as never,
    financesService as unknown as FinancesService,
    responsibility,
    {} as never,
  );
  return { service, financesService, metersRepository, sharesService };
}

const coords = {
  meterId: 'meter-1',
  memberId: 'member-1' as string | null,
  amount: 6000,
  paymentMethod: PaymentMethod.CASH,
  reference: 'REF-1',
  notes: 'nota',
  paidAt: '2026-10-05',
};

describe('SharePaymentsService.createAsPartOfTransaction', () => {
  it('creates the payment and books the finance movement in the same transaction', async () => {
    const { service, financesService } = makeService();
    const manager = makeManager();

    const created = await service.createAsPartOfTransaction(
      manager as unknown as EntityManager,
      coords,
      'user-registrant',
    );

    expect(manager.__saved).toHaveLength(1);
    expect(financesService.validateMovement).toHaveBeenCalledTimes(1);
    expect(financesService.recordIncome).toHaveBeenCalledTimes(1);
    expect(financesService.recordIncome).toHaveBeenCalledWith(
      expect.objectContaining({
        sourceType: FinanceSourceType.WATER_MEMBERSHIP_FEE,
        sourceId: created.id,
        amount: 6000,
        memberId: 'member-1',
        responsibleUserId: 'responsible-1',
        collectorUserId: 'user-registrant',
        registeredByUserId: 'user-registrant',
      }),
      undefined,
      manager,
    );
    const savedRow = manager.__saved[0] as unknown as SharePayment;
    expect(savedRow.share_id).toBe('share-1');
    expect(savedRow.amount).toBe('6000');
  });

  it('keeps an explicit collector instead of the registrant', async () => {
    const { service, financesService } = makeService();
    const manager = makeManager();

    await service.createAsPartOfTransaction(
      manager as unknown as EntityManager,
      { ...coords, collectorUserId: 'collector-1' },
      'user-registrant',
    );

    expect(financesService.recordIncome.mock.calls[0][0]).toMatchObject({
      collectorUserId: 'collector-1',
      registeredByUserId: 'user-registrant',
    });
  });

  it('resolves the member from the meter when it is not provided', async () => {
    const { service, financesService, metersRepository } = makeService({
      memberId: 'member-2',
    });
    const manager = makeManager();

    await service.createAsPartOfTransaction(
      manager as unknown as EntityManager,
      { ...coords, memberId: undefined },
      'user-registrant',
    );

    expect(metersRepository.findOne).toHaveBeenCalledWith({
      where: { id: 'meter-1' },
      relations: ['member'],
    });
    expect(financesService.recordIncome.mock.calls[0][0]).toMatchObject({
      memberId: 'member-2',
    });
  });

  it('rolls back nothing but fails before the payment row when validation fails', async () => {
    const { service, financesService } = makeService();
    financesService.validateMovement.mockRejectedValue(
      new Error('User not found'),
    );
    const manager = makeManager();

    await expect(
      service.createAsPartOfTransaction(
        manager as unknown as EntityManager,
        coords,
        'user-registrant',
      ),
    ).rejects.toThrow('User not found');

    expect(manager.__saved).toHaveLength(0);
    expect(financesService.recordIncome).not.toHaveBeenCalled();
  });
});
