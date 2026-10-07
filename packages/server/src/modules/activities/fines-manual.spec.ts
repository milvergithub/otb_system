import { FinesService } from './fines.service';

jest.mock('@nestjs/event-emitter', () => ({
  EventEmitter2: class EventEmitter2 {},
}));

import { FinancesService } from '../finances/finances.service';
import { FineSource, FineStatus } from './entities/fine.entity';
import { FineTypeAppliesTo } from './entities/fine-type.entity';

function makeService(
  overrides: {
    fineType?: unknown;
    member?: unknown;
  } = {},
) {
  const fineRepo = {
    create: jest.fn((value) => value),
    save: jest.fn(async (value) => value),
    findOne: jest.fn().mockResolvedValue(null),
  };
  const service = new FinesService(
    fineRepo as never,
    {
      findOneBy: jest.fn().mockResolvedValue(
        overrides.fineType === undefined
          ? {
              id: 'ft-1',
              amount: '50.00',
              is_active: true,
              applies_to: FineTypeAppliesTo.MANUAL,
            }
          : overrides.fineType,
      ),
    } as never,
    {
      findOneBy: jest
        .fn()
        .mockResolvedValue(
          overrides.member === undefined
            ? { id: 'member-1' }
            : overrides.member,
        ),
    } as never,
    { findOneBy: jest.fn().mockResolvedValue({ id: 'act-1' }) } as never,
    {} as never,
    {} as unknown as FinancesService,
    {} as never,
  );
  return { service, fineRepo };
}

describe('FinesService manual fines', () => {
  it('creates a manual fine attributed to the authenticated user', async () => {
    const { service, fineRepo } = makeService();

    await service.createManual(
      'act-1',
      { memberId: 'member-1', fineTypeId: 'ft-1', notes: 'Incumplimiento' },
      'user-1',
    );

    expect(fineRepo.create).toHaveBeenCalledWith(
      expect.objectContaining({
        activity_id: 'act-1',
        member_id: 'member-1',
        amount: '50.00',
        source: FineSource.MANUAL,
        status: FineStatus.PENDING,
        created_by_user_id: 'user-1',
      }),
    );
  });

  it('never accepts an issuer coming from the client payload', async () => {
    const { service, fineRepo } = makeService();

    await service.createManual(
      'act-1',
      {
        memberId: 'member-1',
        fineTypeId: 'ft-1',
        notes: undefined,
        createdByUserId: 'attacker',
      } as never,
      'user-1',
    );

    const created = fineRepo.create.mock.calls[0][0];
    expect(created.created_by_user_id).toBe('user-1');
  });

  it('rejects an inactive fine type', async () => {
    const { service } = makeService({
      fineType: { id: 'ft-1', is_active: false },
    });

    await expect(
      service.createManual(
        'act-1',
        { memberId: 'member-1', fineTypeId: 'ft-1' },
        'user-1',
      ),
    ).rejects.toThrow();
  });
});
