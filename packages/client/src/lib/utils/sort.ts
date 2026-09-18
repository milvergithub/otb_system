import type { SortOrder } from "@/components/ui/sortable-header"

const collators = new Map<string, Intl.Collator>()

function collatorFor(locale: string): Intl.Collator {
  let collator = collators.get(locale)
  if (!collator) {
    collator = new Intl.Collator(locale, { numeric: true, sensitivity: "base" })
    collators.set(locale, collator)
  }
  return collator
}

export function compareValues(
  a: unknown,
  b: unknown,
  direction: SortOrder,
  locale = "en",
): number {
  let cmp: number
  if (a == null && b == null) {
    cmp = 0
  } else if (a == null) {
    cmp = 1
  } else if (b == null) {
    cmp = -1
  } else if (typeof a === "number" && typeof b === "number") {
    cmp = a - b
  } else {
    cmp = collatorFor(locale).compare(String(a), String(b))
  }
  return direction === "desc" ? -cmp : cmp
}

export function sortList<T>(
  items: T[],
  key: string,
  direction: SortOrder,
  accessor: (item: T) => unknown,
  locale = "en",
): T[] {
  return [...items].sort((x, y) =>
    compareValues(accessor(x), accessor(y), direction, locale),
  )
}
