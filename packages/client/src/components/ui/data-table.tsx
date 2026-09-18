"use client"

import * as React from "react"
import { useTranslation } from "react-i18next"
import { cn } from "@/lib/utils"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { SortableHeader, type SortState } from "@/components/ui/sortable-header"

export interface DataTableColumn<T> {
  key: string
  label: string
  sortable?: boolean
  align?: "left" | "right" | "center"
  className?: string
  stickyRight?: boolean
  render?: (row: T) => React.ReactNode
}

const stickyRightClasses =
  "max-md:sticky max-md:right-0 max-md:border-l max-md:bg-card"

export interface DataTableProps<T> {
  columns: DataTableColumn<T>[]
  data: T[]
  sort?: SortState
  onSort?: (key: string) => void
  isLoading?: boolean
  emptyIcon?: React.ReactNode
  emptyText?: string
  rowKey: (row: T) => string
  onRowClick?: (row: T) => void
  rowClassName?: (row: T) => string
}

export function DataTable<T>({
  columns,
  data,
  sort,
  onSort,
  isLoading,
  emptyIcon,
  emptyText,
  rowKey,
  onRowClick,
  rowClassName,
}: DataTableProps<T>) {
  const { t } = useTranslation()
  const colSpan = columns.length

  return (
    <Table>
      <TableHeader>
        <TableRow>
          {columns.map((col) =>
            col.sortable && sort !== undefined && onSort ? (
              <SortableHeader
                key={col.key}
                label={col.label}
                sortKey={col.key}
                sort={sort}
                onSort={onSort}
                align={col.align}
                className={cn(col.className, col.stickyRight && stickyRightClasses)}
              />
            ) : (
              <TableHead
                key={col.key}
                className={cn(
                  col.align === "right" && "text-right",
                  col.className,
                  col.stickyRight && stickyRightClasses,
                )}
              >
                {col.label}
              </TableHead>
            ),
          )}
        </TableRow>
      </TableHeader>
      <TableBody>
        {isLoading ? (
          <TableRow>
            <TableCell colSpan={colSpan} className="h-24 text-center">
              {t("common.loading")}
            </TableCell>
          </TableRow>
        ) : data.length === 0 ? (
          <TableRow>
            <TableCell colSpan={colSpan} className="h-24 text-center">
              {emptyIcon ? <div className="mx-auto mb-2 flex justify-center">{emptyIcon}</div> : null}
              {emptyText ?? t("common.noData")}
            </TableCell>
          </TableRow>
        ) : (
          data.map((row) => (
            <TableRow
              key={rowKey(row)}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              className={rowClassName?.(row)}
            >
              {columns.map((col) => (
                <TableCell
                  key={col.key}
                  className={cn(
                    col.align === "right" && "text-right",
                    col.className,
                    col.stickyRight && stickyRightClasses,
                  )}
                >
                  {col.render ? col.render(row) : String((row as Record<string, unknown>)[col.key] ?? "—")}
                </TableCell>
              ))}
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  )
}
