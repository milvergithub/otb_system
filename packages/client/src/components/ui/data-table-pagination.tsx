"use client"

import { useTranslation } from "react-i18next"
import { Button } from "@/components/ui/button"

export interface DataTablePaginationProps {
  page: number
  totalPages: number
  total: number
  onPageChange: (page: number) => void
  noun?: string
}

export function DataTablePagination({ page, totalPages, total, onPageChange, noun }: DataTablePaginationProps) {
  const { t } = useTranslation()

  if (totalPages <= 1) return null

  return (
    <div className="flex items-center justify-between">
      <p className="text-sm text-muted-foreground">
        {t("common.pageInfo", { page, total, count: total, noun: noun ?? "" })}
      </p>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
          {t("common.previous")}
        </Button>
        <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => onPageChange(page + 1)}>
          {t("common.next")}
        </Button>
      </div>
    </div>
  )
}
