import { Brackets, ObjectLiteral, SelectQueryBuilder } from 'typeorm';
import { applyTokenizedSearch } from './search';

function makeQueryBuilder() {
  const qb: Record<string, jest.Mock> = {};
  qb.where = jest.fn(() => qb);
  qb.orWhere = jest.fn(() => qb);
  qb.andWhere = jest.fn(() => qb);
  return qb;
}

type MockQueryBuilder = ReturnType<typeof makeQueryBuilder>;

function apply(search: string | undefined, columns = ['m.first_name']) {
  const qb = makeQueryBuilder();
  applyTokenizedSearch(
    qb as unknown as SelectQueryBuilder<ObjectLiteral>,
    search,
    columns,
  );
  return qb;
}

function outerBrackets(qb: MockQueryBuilder): Brackets[] {
  return qb.andWhere.mock.calls
    .map((call) => call[0])
    .filter((arg): arg is Brackets => arg instanceof Brackets);
}

function expand(bracket: unknown): MockQueryBuilder {
  const inner = makeQueryBuilder();
  (bracket as Brackets).whereFactory(inner as never);
  return inner;
}

describe('applyTokenizedSearch', () => {
  it('adds nothing for a blank search', () => {
    expect(outerBrackets(apply('   '))).toHaveLength(0);
    expect(outerBrackets(apply(undefined))).toHaveLength(0);
    expect(outerBrackets(apply(''))).toHaveLength(0);
  });

  it('ORs the columns inside a single token and unaccents both sides', () => {
    const qb = apply('martinez', ['m.first_name', 'm.last_name', 'm.ci']);

    const outer = expand(outerBrackets(qb)[0]);
    const tokenFilters = outer.andWhere.mock.calls;
    expect(tokenFilters).toHaveLength(1);
    expect(tokenFilters[0][1]).toEqual({ searchToken0: '%martinez%' });

    const token = expand(tokenFilters[0][0]);
    const columns = [
      ...token.where.mock.calls,
      ...token.orWhere.mock.calls,
    ].map((call) => call[0]);
    expect(columns).toEqual([
      'unaccent(m.first_name) ILIKE unaccent(:searchToken0)',
      'unaccent(m.last_name) ILIKE unaccent(:searchToken0)',
      'unaccent(m.ci) ILIKE unaccent(:searchToken0)',
    ]);
  });

  it('ANDs whitespace-separated tokens with independent parameters', () => {
    const qb = apply('  Juan   Martinez ', ['m.first_name', 'm.last_name']);

    const outer = expand(outerBrackets(qb)[0]);
    const tokenFilters = outer.andWhere.mock.calls;
    expect(tokenFilters).toHaveLength(2);
    expect(tokenFilters[0][1]).toEqual({ searchToken0: '%Juan%' });
    expect(tokenFilters[1][1]).toEqual({ searchToken1: '%Martinez%' });

    const second = expand(tokenFilters[1][0]);
    expect(second.where.mock.calls[0][0]).toBe(
      'unaccent(m.first_name) ILIKE unaccent(:searchToken1)',
    );
  });

  it('honours a custom parameter prefix', () => {
    const qb = makeQueryBuilder();
    applyTokenizedSearch(
      qb as unknown as SelectQueryBuilder<ObjectLiteral>,
      'abc',
      ['m.code'],
      'q',
    );
    const outer = expand(outerBrackets(qb)[0]);
    expect(outer.andWhere.mock.calls[0][1]).toEqual({ q0: '%abc%' });
  });

  it('adds nothing when no columns are given', () => {
    expect(outerBrackets(apply('abc', []))).toHaveLength(0);
  });
});
