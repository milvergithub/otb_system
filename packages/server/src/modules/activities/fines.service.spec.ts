import { FinesService } from './fines.service';

jest.mock('@nestjs/event-emitter', () => ({
  EventEmitter2: class EventEmitter2 {},
}));

import { FinancesService } from '../finances/finances.service';
import type { Fine } from './entities/fine.entity';

type Internals = {
  recordFineIncome: (
    fine: Fine,
    manager?: unknown,
    context?: {
      explicitCollectorUserId: string | null;
      registeredByUserId: string | null;
    },
  ) => Promise<void>;
};

function makeService() {
  const financesService = {
    recordIncome: jest.fn(),
    validateMovement: jest.fn(),
  };
  const noop = {} as never;
  const service = new FinesService(
    noop, // fine repo
    noop, // fineType repo
    noop, // members repo
    noop, // activities repo
    noop, // eventEmitter
    financesService as unknown as FinancesService,
    noop, // dataSource
  ) as unknown as Internals;
  return { service, financesService };
}

function fineWith(activity: Fine['activity'], createdBy = 'creator-1'): Fine {
  return {
    id: 'fine-1',
    amount: '20.00',
    member_id: 'member-1',
    notes: null,
    paid_at: '2026-02-01T12:00:00.000Z',
    activity,
    activity_id: activity ? activity.id : null,
    fineType: { name: 'Falta inicio' },
  } as unknown as Fine;
}

describe('FinesService payment attribution', () => {
  it('attributes the movement to the activity collector', async () => {
    const { service, financesService } = makeService();
    const fine = fineWith({
      id: 'act-1',
      name: 'Asamblea',
      created_by: 'creator-1',
      collector_user_id: 'collector-2',
    } as never);

    await service.recordFineIncome(fine, undefined, {
      explicitCollectorUserId: null,
      registeredByUserId: 'registrant-1',
    });

    expect(financesService.recordIncome).toHaveBeenCalledWith(
      expect.objectContaining({
        sourceId: 'fine-1',
        amount: 20,
        responsibleUserId: 'collector-2',
        activityId: 'act-1',
        collectorUserId: 'collector-2',
        registeredByUserId: 'registrant-1',
      }),
    );
  });

  it('prefers an explicitly provided collector over the activity collector', async () => {
    const { service, financesService } = makeService();
    const fine = fineWith({
      id: 'act-1',
      name: 'Asamblea',
      created_by: 'creator-1',
      collector_user_id: 'collector-2',
    } as never);

    await service.recordFineIncome(fine, undefined, {
      explicitCollectorUserId: 'collector-1',
      registeredByUserId: 'registrant-1',
    });

    const input = financesService.recordIncome.mock.calls[0][0];
    expect(input.collectorUserId).toBe('collector-1');
    // The responsibility snapshot always comes from the activity collector.
    expect(input.responsibleUserId).toBe('collector-2');
  });

  it('falls back to the registrant when the activity has no collector', async () => {
    const { service, financesService } = makeService();
    const fine = fineWith({
      id: 'act-2',
      name: 'Asamblea 2',
      created_by: 'creator-2',
      collector_user_id: null,
    } as never);

    await service.recordFineIncome(fine, undefined, {
      explicitCollectorUserId: null,
      registeredByUserId: 'registrant-1',
    });

    const input = financesService.recordIncome.mock.calls[0][0];
    expect(input.responsibleUserId).toBeNull();
    expect(input.collectorUserId).toBe('registrant-1');
    expect(input.registeredByUserId).toBe('registrant-1');
  });

  it('leaves everything unattributed without activity collector or registrant', async () => {
    const { service, financesService } = makeService();
    const fine = fineWith({
      id: 'act-3',
      name: 'Asamblea 3',
      created_by: 'creator-3',
      collector_user_id: null,
    } as never);

    await service.recordFineIncome(fine, undefined, {
      explicitCollectorUserId: null,
      registeredByUserId: null,
    });

    const input = financesService.recordIncome.mock.calls[0][0];
    expect(input.responsibleUserId).toBeNull();
    expect(input.collectorUserId).toBeNull();
    expect(input.registeredByUserId).toBeNull();
  });
});
