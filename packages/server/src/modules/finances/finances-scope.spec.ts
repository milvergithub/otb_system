import { ForbiddenException } from '@nestjs/common';
import { FinancesService, FinanceAccess } from './finances.service';
import { FinanceScope } from './dto/finance-transaction.dto';
import type { FinanceTransaction } from './entities/finance-transaction.entity';

type ServiceInternals = {
  applyScope: (qb: unknown, access: FinanceAccess) => void;
  assertCanAccess: (tx: unknown, access: FinanceAccess) => void;
};

function makeService(): {
  service: ServiceInternals;
  qb: { andWhere: jest.Mock };
} {
  // Repositories are irrelevant for these helpers: no query is executed.
  const noop = {} as never;
  const service = new FinancesService(
    noop,
    noop,
    noop,
    noop,
    noop,
    noop,
    noop,
    noop,
    noop,
    noop,
  ) as unknown as ServiceInternals;
  return { service, qb: { andWhere: jest.fn() } };
}

describe('FinancesService responsibility scope', () => {
  describe('applyScope', () => {
    it('forces the "mine" scope when the user lacks finances.all, ignoring client filters', () => {
      const { service, qb } = makeService();
      service.applyScope(qb, {
        userId: 'user-a',
        canViewAll: false,
        scope: FinanceScope.ALL,
        responsibleUserId: 'user-b',
        collectorUserId: 'user-c',
        registeredByUserId: 'user-d',
      });

      expect(qb.andWhere).toHaveBeenCalledTimes(1);
      expect(qb.andWhere).toHaveBeenCalledWith(
        'tx.responsible_user_id = :scopeResponsibleUserId',
        { scopeResponsibleUserId: 'user-a' },
      );
    });

    it('forces the "mine" scope even with finances.all when scope=mine', () => {
      const { service, qb } = makeService();
      service.applyScope(qb, {
        userId: 'user-a',
        canViewAll: true,
        scope: FinanceScope.MINE,
        responsibleUserId: 'user-b',
      });

      expect(qb.andWhere).toHaveBeenCalledTimes(1);
      expect(qb.andWhere).toHaveBeenCalledWith(
        'tx.responsible_user_id = :scopeResponsibleUserId',
        { scopeResponsibleUserId: 'user-a' },
      );
    });

    it('applies responsibility filters as given with finances.all and scope=all', () => {
      const { service, qb } = makeService();
      service.applyScope(qb, {
        userId: 'user-a',
        canViewAll: true,
        scope: FinanceScope.ALL,
        responsibleUserId: 'user-b',
        collectorUserId: 'user-c',
        registeredByUserId: 'user-d',
      });

      expect(qb.andWhere).toHaveBeenCalledTimes(3);
      expect(qb.andWhere).toHaveBeenCalledWith(
        'tx.responsible_user_id = :filterResponsibleUserId',
        { filterResponsibleUserId: 'user-b' },
      );
      expect(qb.andWhere).toHaveBeenCalledWith(
        'tx.collector_user_id = :filterCollectorUserId',
        { filterCollectorUserId: 'user-c' },
      );
      expect(qb.andWhere).toHaveBeenCalledWith(
        'tx.registered_by_user_id = :filterRegisteredByUserId',
        { filterRegisteredByUserId: 'user-d' },
      );
    });

    it('does not add any condition with finances.all, scope=all and no filters', () => {
      const { service, qb } = makeService();
      service.applyScope(qb, {
        userId: 'user-a',
        canViewAll: true,
        scope: FinanceScope.ALL,
      });
      expect(qb.andWhere).not.toHaveBeenCalled();
    });
  });

  describe('assertCanAccess', () => {
    const tx = (responsibleUserId: string | null) =>
      ({ responsible_user_id: responsibleUserId }) as FinanceTransaction;

    it('allows the responsible user inside the mine scope', () => {
      const { service } = makeService();
      expect(() =>
        service.assertCanAccess(tx('user-a'), {
          userId: 'user-a',
          canViewAll: false,
        }),
      ).not.toThrow();
    });

    it('rejects movements owned by someone else inside the mine scope', () => {
      const { service } = makeService();
      expect(() =>
        service.assertCanAccess(tx('user-b'), {
          userId: 'user-a',
          canViewAll: false,
        }),
      ).toThrow(ForbiddenException);
    });

    it('rejects movements of other users even with finances.all when scope=mine', () => {
      const { service } = makeService();
      expect(() =>
        service.assertCanAccess(tx('user-b'), {
          userId: 'user-a',
          canViewAll: true,
          scope: FinanceScope.MINE,
        }),
      ).toThrow(ForbiddenException);
    });

    it('allows any movement with finances.all and scope=all (visibility only)', () => {
      const { service } = makeService();
      expect(() =>
        service.assertCanAccess(tx('user-b'), {
          userId: 'user-a',
          canViewAll: true,
          scope: FinanceScope.ALL,
        }),
      ).not.toThrow();
    });

    it('denies movements without an assigned responsible inside the mine scope', () => {
      const { service } = makeService();
      expect(() =>
        service.assertCanAccess(tx(null), {
          userId: 'user-a',
          canViewAll: true,
          scope: FinanceScope.MINE,
        }),
      ).toThrow(ForbiddenException);
    });
  });
});
