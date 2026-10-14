import { Brackets, ObjectLiteral, SelectQueryBuilder } from 'typeorm';

/**
 * Applies a tokenized, accent-insensitive search to a query builder.
 *
 * The search string is split on whitespace; every token must match at least
 * one of the given columns (OR inside a token, AND across tokens), so
 * "juan martinez" finds "Juan Tobias Martinez Tisco" and the order does not
 * matter. Both sides of each comparison go through `unaccent()`, so "jose"
 * matches "José" (requires the unaccent extension, created by migration 0028
 * and ensured at bootstrap).
 *
 * Column names must be fully qualified with their query alias, e.g.
 * `member.first_name`. A blank search adds no condition.
 */
export function applyTokenizedSearch<T extends ObjectLiteral>(
  qb: SelectQueryBuilder<T>,
  search: string | undefined,
  columns: string[],
  paramPrefix = 'searchToken',
): void {
  const tokens = (search ?? '').trim().split(/\s+/).filter(Boolean);
  if (tokens.length === 0 || columns.length === 0) {
    return;
  }

  qb.andWhere(
    new Brackets((where) => {
      tokens.forEach((token, index) => {
        const key = `${paramPrefix}${index}`;
        where.andWhere(
          new Brackets((tokenWhere) => {
            columns.forEach((column, columnIndex) => {
              const expression = `unaccent(${column}) ILIKE unaccent(:${key})`;
              if (columnIndex === 0) {
                tokenWhere.where(expression);
              } else {
                tokenWhere.orWhere(expression);
              }
            });
          }),
          { [key]: `%${token}%` },
        );
      });
    }),
  );
}
