import { useCallback, useState } from "react"

import type { SortOrder, SortState } from "@/components/ui/sortable-header"

export function useTableSort(
  initial: { key: string; order: SortOrder } | null = null,
  onChange?: () => void,
) {
  const [sort, setSort] = useState<SortState>(initial)

  const toggleSort = useCallback(
    (key: string) => {
      setSort((prev) => {
        if (prev?.key !== key) return { key, order: "asc" }
        if (prev.order === "asc") return { key, order: "desc" }
        return null
      })
      onChange?.()
    },
    [onChange],
  )

  return { sort, setSort, toggleSort }
}
