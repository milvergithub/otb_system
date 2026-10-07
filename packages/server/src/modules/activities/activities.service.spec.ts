import { ActivitiesService } from './activities.service';
import { ActivityStatus } from './entities/activity.entity';

type Internals = {
  assertTransition(from: ActivityStatus, to: ActivityStatus): void;
  update(
    id: string,
    dto: Record<string, unknown>,
    userId: string,
    canViewAll: boolean,
  ): Promise<unknown>;
};

function makeService(existing?: Record<string, unknown>) {
  const repo = {
    findOne: jest.fn().mockResolvedValue(existing ?? null),
    save: jest.fn(async (value) => value),
    remove: jest.fn(),
    update: jest.fn().mockResolvedValue(undefined),
    create: jest.fn((value) => value),
  };
  const service = new ActivitiesService(
    repo as never,
    {} as never, // activityTypeRepo
    { findOneBy: jest.fn().mockResolvedValue({ id: 'user-1' }) } as never,
    {} as never, // attendanceRepo
    {} as never, // fineRepo
    {} as never, // transactionsRepo
    {} as never, // evidenceRepo
    {} as never, // sessionRepo
  ) as unknown as Internals;
  return { service, repo };
}

describe('ActivitiesService status transitions', () => {
  it('allows the forward lifecycle', () => {
    const { service } = makeService();
    expect(() =>
      service.assertTransition(ActivityStatus.DRAFT, ActivityStatus.SCHEDULED),
    ).not.toThrow();
    expect(() =>
      service.assertTransition(
        ActivityStatus.SCHEDULED,
        ActivityStatus.IN_PROGRESS,
      ),
    ).not.toThrow();
    expect(() =>
      service.assertTransition(
        ActivityStatus.IN_PROGRESS,
        ActivityStatus.COMPLETED,
      ),
    ).not.toThrow();
  });

  it('allows cancelling a scheduled or in-progress activity', () => {
    const { service } = makeService();
    expect(() =>
      service.assertTransition(
        ActivityStatus.SCHEDULED,
        ActivityStatus.CANCELLED,
      ),
    ).not.toThrow();
    expect(() =>
      service.assertTransition(
        ActivityStatus.IN_PROGRESS,
        ActivityStatus.CANCELLED,
      ),
    ).not.toThrow();
  });

  it('rejects incoherent transitions', () => {
    const { service } = makeService();
    expect(() =>
      service.assertTransition(ActivityStatus.COMPLETED, ActivityStatus.DRAFT),
    ).toThrow();
    expect(() =>
      service.assertTransition(
        ActivityStatus.CANCELLED,
        ActivityStatus.IN_PROGRESS,
      ),
    ).toThrow();
    expect(() =>
      service.assertTransition(
        ActivityStatus.COMPLETED,
        ActivityStatus.SCHEDULED,
      ),
    ).toThrow();
  });
});

describe('ActivitiesService user references', () => {
  it('persists responsible and collector through a raw column update', async () => {
    const existing = {
      id: 'act-1',
      created_by: 'user-1',
      name: 'Asamblea',
      status: ActivityStatus.SCHEDULED,
      responsible_user_id: null,
      collector_user_id: null,
    };
    const { service, repo } = makeService(existing);
    repo.findOne.mockResolvedValueOnce(existing).mockResolvedValueOnce({
      ...existing,
      responsible_user_id: 'user-2',
      collector_user_id: 'user-3',
    });

    await service.update(
      'act-1',
      { responsibleUserId: 'user-2', collectorUserId: 'user-3' },
      'user-1',
      true,
    );

    expect(repo.update).toHaveBeenCalledWith(
      'act-1',
      expect.objectContaining({
        responsible_user_id: 'user-2',
        collector_user_id: 'user-3',
      }),
    );
    expect(repo.save).not.toHaveBeenCalled();
  });
});
