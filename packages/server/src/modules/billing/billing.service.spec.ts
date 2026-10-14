jest.mock('@nestjs/event-emitter', () => ({
  EventEmitter2: class EventEmitter2 {},
}));

import { Brackets } from 'typeorm';
import { BillingService } from './billing.service';

function makeQueryBuilder() {
  const qb: Record<string, jest.Mock> = {};
  qb.leftJoinAndSelect = jest.fn(() => qb);
  qb.withDeleted = jest.fn(() => qb);
  qb.where = jest.fn(() => qb);
  qb.orWhere = jest.fn(() => qb);
  qb.andWhere = jest.fn(() => qb);
  qb.orderBy = jest.fn(() => qb);
  qb.addOrderBy = jest.fn(() => qb);
  qb.skip = jest.fn(() => qb);
  qb.take = jest.fn(() => qb);
  qb.getManyAndCount = jest.fn(async () => [[], 0]);
  return qb;
}

type MockQueryBuilder = ReturnType<typeof makeQueryBuilder>;

function makeService() {
  const qb = makeQueryBuilder();
  const paymentsRepository = {
    createQueryBuilder: jest.fn(() => qb),
  };
  const service = new BillingService(
    paymentsRepository as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
  );
  return { service, paymentsRepository, qb };
}

function searchBrackets(qb: MockQueryBuilder): Brackets[] {
  return qb.andWhere.mock.calls
    .map((call) => call[0])
    .filter((arg): arg is Brackets => arg instanceof Brackets);
}

function expand(bracket: unknown): MockQueryBuilder {
  const inner = makeQueryBuilder();
  (bracket as Brackets).whereFactory(inner as never);
  return inner;
}

describe('BillingService search', () => {
  it('does not filter when the search is blank', async () => {
    const { service, qb } = makeService();

    await service.findAll({ page: 1, limit: 10 } as never, { search: '   ' });

    expect(searchBrackets(qb)).toHaveLength(0);
  });

  it('matches a single token across member name and meter code, accent-insensitively', async () => {
    const { service, qb } = makeService();

    await service.findAll({ page: 1, limit: 10 } as never, {
      search: 'martinez',
    });

    const brackets = searchBrackets(qb);
    expect(brackets).toHaveLength(1);

    const tokenFilters = expand(brackets[0]).andWhere.mock.calls;
    expect(tokenFilters).toHaveLength(1);
    expect(tokenFilters[0][1]).toEqual({ searchToken0: '%martinez%' });

    const token = expand(tokenFilters[0][0]);
    const columns = [
      ...token.where.mock.calls,
      ...token.orWhere.mock.calls,
    ].map((call) => call[0]);
    expect(columns).toEqual([
      'unaccent(member.first_name) ILIKE unaccent(:searchToken0)',
      'unaccent(member.last_name) ILIKE unaccent(:searchToken0)',
      'unaccent(meter.code) ILIKE unaccent(:searchToken0)',
    ]);
  });

  it('ANDs every token so a full name matches across columns', async () => {
    const { service, qb } = makeService();

    await service.findAll({ page: 1, limit: 10 } as never, {
      search: '  Juan   Martinez ',
    });

    const outer = expand(searchBrackets(qb)[0]);
    const tokenFilters = outer.andWhere.mock.calls;
    expect(tokenFilters).toHaveLength(2);
    expect(tokenFilters[0][1]).toEqual({ searchToken0: '%Juan%' });
    expect(tokenFilters[1][1]).toEqual({ searchToken1: '%Martinez%' });
  });

  it('applies the meter filter alongside the search', async () => {
    const { service, qb } = makeService();

    await service.findAll({ page: 1, limit: 10 } as never, {
      meterId: 'meter-1',
      search: 'jose',
    });

    expect(qb.andWhere).toHaveBeenCalledWith(
      'consumption.meter_id = :meterId',
      { meterId: 'meter-1' },
    );
    expect(searchBrackets(qb)).toHaveLength(1);
  });
});
