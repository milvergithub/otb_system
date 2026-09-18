import { useMemo } from "react"
import i18n from "@/lib/i18n"
import { sortList } from "@/lib/utils/sort"
import type { SortState } from "@/components/ui/sortable-header"

export function useSortedData<T>(
  items: T[] | undefined,
  sort: SortState,
  accessor: (item: T, key: string) => unknown,
  fallbackKey: string,
  fallbackOrder: "asc" | "desc" = "asc",
): T[] {
  return useMemo(() => {
    const list = items ?? []
    if (!sort) {
      return sortList(list, fallbackKey, fallbackOrder, (item) => accessor(item, fallbackKey), i18n.language)
    }
    return sortList(list, sort.key, sort.order, (item) => accessor(item, sort.key), i18n.language)
  }, [items, sort, accessor, fallbackKey, fallbackOrder])
}
