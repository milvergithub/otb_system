"use client"

import { useState } from "react"
import { useTranslation } from "react-i18next"
import { ChevronDown, Download, Search } from "lucide-react"
import { formatDate, cn } from "@/lib/utils"
import type { AuditLog, AuditAction } from "@/lib/types"
import { useAuth } from "@/lib/auth"
import { useAuditLogs, exportAuditCsv } from "@/hooks/audit"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { DatePicker } from "@/components/ui/date-picker"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { toast } from "sonner"
import { getApiErrorMessage } from "@/lib/api"
import { ComboboxSelect } from "@/components/ui/combobox"

const ENTITY_OPTIONS = [
  "users",
  "members",
  "meters",
  "tariffs",
  "base_tariffs",
  "settings",
  "consumptions",
  "payments",
  "payment_history",
  "discounts",
  "notifications",
  "roles",
  "permissions",
  "user_roles",
  "role_permissions",
  "shares",
  "share_payments",
  "zones",
]

const ACTION_OPTIONS: { value: string; labelKey: string }[] = [
  { value: "create", labelKey: "audit.actions.create" },
  { value: "update", labelKey: "audit.actions.update" },
  { value: "delete", labelKey: "audit.actions.delete" },
]

function ValuesJson({ values }: { values: Record<string, unknown> | null }) {
  const { t } = useTranslation()
  if (!values || Object.keys(values).length === 0) {
    return <span className="text-muted-foreground">{t("common.noData")}</span>
  }
  return (
    <pre className="max-w-full overflow-x-auto text-xs">
      {JSON.stringify(values, null, 2)}
    </pre>
  )
}

function ActionBadge({ action }: { action: AuditAction }) {
  const { t } = useTranslation()
  const variants: Record<AuditAction, "default" | "secondary" | "destructive"> = {
    create: "default",
    update: "secondary",
    delete: "destructive",
  }
  return (
    <Badge variant={variants[action]}>
      {t(`audit.actions.${action}`)}
    </Badge>
  )
}

export default function AuditLogsPage() {
  const { t } = useTranslation()
  const { hasPermission } = useAuth()

  const [page, setPage] = useState(1)
  const [entityFilter, setEntityFilter] = useState("")
  const [actionFilter, setActionFilter] = useState("")
  const [userIdFilter, setUserIdFilter] = useState("")
  const [dateFrom, setDateFrom] = useState<string>("")
  const [dateTo, setDateTo] = useState<string>("")
  const [expandedRow, setExpandedRow] = useState<string | null>(null)

  const { data, isLoading, error } = useAuditLogs({
    page,
    entity: entityFilter || undefined,
    action: actionFilter || undefined,
    userId: userIdFilter || undefined,
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
  })

  const applyFilters = () => {
    setPage(1)
  }

  const clearFilters = () => {
    setEntityFilter("")
    setActionFilter("")
    setUserIdFilter("")
    setDateFrom("")
    setDateTo("")
    setPage(1)
  }

  const handleExport = async () => {
    try {
      await exportAuditCsv({
        entity: entityFilter || undefined,
        action: actionFilter || undefined,
        userId: userIdFilter || undefined,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
      })
    } catch (err) {
      toast.error(getApiErrorMessage(err))
    }
  }

  if (!hasPermission("audit.read")) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <p className="text-muted-foreground">{t("users.accessDenied")}</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t("audit.title")}</h1>
          <p className="text-sm text-muted-foreground">
            {t("audit.subtitle")}
          </p>
        </div>
        <Button variant="outline" onClick={handleExport}>
          <Download className="mr-2 size-4" />
          {t("audit.exportCsv")}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("common.all")}: {t("audit.filterEntityPlaceholder")}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <div>
            <label className="text-xs font-medium text-muted-foreground">
              {t("audit.entity")}
            </label>
            <ComboboxSelect value={entityFilter} onValueChange={setEntityFilter} placeholder={t("audit.filterEntityPlaceholder")} className="w-full" options={[
              { label: t("audit.allEntities"), value: "" },
              ...ENTITY_OPTIONS.map((e) => ({ label: e, value: e })),
            ]} />
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground">
              {t("audit.action")}
            </label>
            <ComboboxSelect value={actionFilter} onValueChange={setActionFilter} placeholder={t("audit.filterActionPlaceholder")} className="w-full" options={[
              { label: t("audit.allActions"), value: "" },
              ...ACTION_OPTIONS.map((a) => ({ label: t(a.labelKey), value: a.value })),
            ]} />
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground">
              {t("audit.userId")}
            </label>
            <Input
              placeholder={t("audit.filterUserPlaceholder")}
              value={userIdFilter}
              onChange={(e) => setUserIdFilter(e.target.value)}
            />
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground">
              {t("audit.dateFrom")}
            </label>
            <DatePicker
              value={dateFrom}
              onChange={setDateFrom}
            />
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground">
              {t("audit.dateTo")}
            </label>
            <DatePicker
              value={dateTo}
              onChange={setDateTo}
            />
          </div>

          <div className="flex items-end gap-2">
            <Button size="sm" onClick={applyFilters}>
              <Search className="mr-2 size-4" />
              {t("common.save")}
            </Button>
            <Button size="sm" variant="outline" onClick={clearFilters}>
              {t("common.all")}
            </Button>
          </div>
        </CardContent>
      </Card>

      {error ? (
        <p className="text-sm text-destructive">{getApiErrorMessage(error)}</p>
      ) : null}

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t("audit.timestamp")}</TableHead>
                <TableHead>{t("audit.action")}</TableHead>
                <TableHead>{t("audit.entity")}</TableHead>
                <TableHead>{t("audit.entityId")}</TableHead>
                <TableHead>{t("audit.userId")}</TableHead>
                <TableHead>{t("audit.ipAddress")}</TableHead>
                <TableHead className="text-right">{t("common.expand")}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center">
                    {t("common.loading")}
                  </TableCell>
                </TableRow>
              ) : !data?.items?.length ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center">
                    {t("audit.noLogsFound")}
                  </TableCell>
                </TableRow>
              ) : (
                data!.items.map((log: AuditLog) => (
                  <>
                    <TableRow
                      key={log.id}
                      className="cursor-pointer"
                      onClick={() =>
                        setExpandedRow(
                          expandedRow === log.id ? null : log.id,
                        )
                      }
                    >
                      <TableCell className="text-sm">
                        {formatDate(log.created_at)}
                      </TableCell>
                      <TableCell>
                        <ActionBadge action={log.action} />
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {log.entity}
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {log.entity_id}
                      </TableCell>
                      <TableCell className="text-sm">
                        {log.user?.email ?? (
                          <span className="text-muted-foreground">
                            {log.user_id ?? t("common.noData")}
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm">
                        {log.ip_address ?? t("common.noData")}
                      </TableCell>
                      <TableCell
                        className="text-right"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            setExpandedRow(
                              expandedRow === log.id ? null : log.id,
                            )
                          }
                        >
                          <ChevronDown
                            className={cn(
                              "size-4 transition-transform",
                              expandedRow === log.id && "rotate-180",
                            )}
                          />
                        </Button>
                      </TableCell>
                    </TableRow>
                    {expandedRow === log.id && (
                      <TableRow>
                        <TableCell colSpan={7} className="bg-muted/50">
                          <div className="grid gap-4 p-4 md:grid-cols-2">
                            <div>
                              <label className="text-xs font-medium text-muted-foreground">
                                {t("audit.oldValues")}
                              </label>
                              <ValuesJson values={log.old_values} />
                            </div>
                            <div>
                              <label className="text-xs font-medium text-muted-foreground">
                                {t("audit.newValues")}
                              </label>
                              <ValuesJson values={log.new_values} />
                            </div>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {data && data.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            {t("common.pageInfo", {
              page: data.page,
              total: data.totalPages,
              count: data.total,
              noun: t("audit.noLogs"),
            })}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              {t("common.previous")}
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= data.totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              {t("common.next")}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
