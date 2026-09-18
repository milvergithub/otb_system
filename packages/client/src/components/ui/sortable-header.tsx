"use client"

import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react"

import { cn } from "@/lib/utils"
import { TableHead } from "@/components/ui/table"

export type SortOrder = "asc" | "desc"

export type SortState = { key: string; order: SortOrder } | null

interface SortableHeaderProps {
  label: string
  sortKey: string
  sort: SortState
  onSort: (key: string) => void
  align?: "left" | "right" | "center"
  className?: string
}

export function SortableHeader({
  label,
  sortKey,
  sort,
  onSort,
  align = "left",
  className,
}: SortableHeaderProps) {
  const active = sort?.key === sortKey
  const ariaSort = active
    ? sort!.order === "asc"
      ? "ascending"
      : "descending"
    : "none"

  return (
    <TableHead
      aria-sort={ariaSort}
      className={cn(align === "right" && "text-right", className)}
    >
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className={cn(
          "inline-flex items-center gap-1 select-none rounded-sm text-muted-foreground hover:text-foreground",
          active && "text-foreground",
          align === "right" && "justify-end"
        )}
      >
        {label}
        {active ? (
          sort!.order === "asc" ? (
            <ArrowUp className="size-3.5" />
          ) : (
            <ArrowDown className="size-3.5" />
          )
        ) : (
          <ArrowUpDown className="size-3.5 text-muted-foreground/50" />
        )}
      </button>
    </TableHead>
  )
}
