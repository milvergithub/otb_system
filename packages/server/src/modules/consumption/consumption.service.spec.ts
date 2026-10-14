import { Brackets } from 'typeorm';
import { ConsumptionService } from './consumption.service';

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
  const consumptionsRepository = {
    createQueryBuilder: jest.fn(() => qb),
  };
  const service = new ConsumptionService(
    consumptionsRepository as never,
    {} as never,
    {} as never,
  );
  return { service, consumptionsRepository, qb };
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

describe('ConsumptionService search', () => {
  it('does not filter when the search is blank', async () => {
    const { service, qb } = makeService();

    await service.findAll({ page: 1, limit: 10 } as never, { search: '   ' });

    expect(searchBrackets(qb)).toHaveLength(0);
  });

  it('matches a single token across code and member name/CI, accent-insensitively', async () => {
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
      'unaccent(meter.code) ILIKE unaccent(:searchToken0)',
      'unaccent(member.first_name) ILIKE unaccent(:searchToken0)',
      'unaccent(member.last_name) ILIKE unaccent(:searchToken0)',
      'unaccent(member.ci) ILIKE unaccent(:searchToken0)',
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

  it('combines the search with the year/month/meter filters', async () => {
    const { service, qb } = makeService();

    await service.findAll({ page: 1, limit: 10 } as never, {
      year: 2026,
      month: 5,
      meterId: 'meter-1',
      search: 'jose',
    });

    expect(qb.andWhere).toHaveBeenCalledWith('consumption.year = :year', {
      year: 2026,
    });
    expect(qb.andWhere).toHaveBeenCalledWith('consumption.month = :month', {
      month: 5,
    });
    expect(qb.andWhere).toHaveBeenCalledWith(
      'consumption.meter_id = :meterId',
      { meterId: 'meter-1' },
    );
    expect(searchBrackets(qb)).toHaveLength(1);
  });
});
