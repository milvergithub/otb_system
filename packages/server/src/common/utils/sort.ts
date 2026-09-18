export type SortDirection = 'ASC' | 'DESC';

export interface SortColumn {
  column: string;
  dir: SortDirection;
}

/**
 * Resolves a whitelisted sort request into safe ORDER BY columns.
 * Unknown sortBy keys are ignored so callers can fall back to the
 * default ordering instead of failing the whole query.
 */
export function buildOrder(
  sortBy: string | undefined,
  sortOrder: SortDirection,
  allowlist: Record<string, string | string[]>,
): SortColumn[] {
  if (!sortBy) {
    return [];
  }
  const mapped = allowlist[sortBy];
  if (!mapped) {
    return [];
  }
  const columns = Array.isArray(mapped) ? mapped : [mapped];
  return columns.map((column) => ({ column, dir: sortOrder }));
}
