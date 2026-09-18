import { useState } from "react"
import { useTranslation } from "react-i18next"
import { Plus, Receipt, BarChart3, FileText, Search, Trash2 } from "lucide-react"
import { monthNames } from "@/lib/utils"
import type { Consumption } from "@/lib/types"
import { useAuth } from "@/lib/auth"
import { useSearchConsumptions } from "@/hooks/consumptions"
import { useMetersSelect } from "@/hooks/meters"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { useTableSort } from "@/hooks/use-sort"
import { RowActions } from "@/components/ui/row-actions"
import { ComboboxSelect } from "@/components/ui/combobox"
import { DataTable } from "@/components/ui/data-table"
import { DataTablePagination } from "@/components/ui/data-table-pagination"
import Can from "@/components/Can"
import RecordConsumptionDialog from "./RecordConsumptionDialog"
import GenerateBillDialog from "./GenerateBillDialog"
import DeleteConsumptionDialog from "./DeleteConsumptionDialog"
import PaymentDetailsDialog from "../billing/PaymentDetailsDialog"

const CURRENT_YEAR = new Date().getFullYear()
const NOW_MS = Date.now()

export default function ConsumptionPage() {
  const { hasPermission } = useAuth()
  const { t } = useTranslation()
  const months = monthNames()
  const [page, setPage] = useState(1)
  const [month, setMonth] = useState<string>("")
  const [year, setYear] = useState<string>("")
  const [meterId, setMeterId] = useState<string>("")
  const [search, setSearch] = useState("")
  const [searchInput, setSearchInput] = useState("")
  const [dialogOpen, setDialogOpen] = useState(false)
  const [generating, setGenerating] = useState<Consumption | null>(null)
  const [deleting, setDeleting] = useState<Consumption | null>(null)
  const [viewingPayment, setViewingPayment] = useState<any>(null)

  const { sort, toggleSort } = useTableSort(
    { key: "period", order: "desc" },
    () => setPage(1),
  )

  const { data, isLoading } = useSearchConsumptions({
    page,
    month,
    year,
    meterId,
    search,
    sortBy: sort?.key,
    sortOrder: sort?.order,
  })

  const { data: meters } = useMetersSelect()

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{t("consumption.title")}</h1>
          <p className="text-sm text-muted-foreground">
            {t("consumption.subtitle")}
          </p>
        </div>
        <Can permission="consumption.create">
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="mr-2 size-4" />
            {t("consumption.recordReading")}
          </Button>
        </Can>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder={t("consumption.searchPlaceholder")}
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                setSearch(searchInput.trim())
                setPage(1)
              }
            }}
          />
        </div>
        <ComboboxSelect
          value={month}
          onValueChange={(v) => { setMonth(v); setPage(1) }}
          placeholder={t("consumption.allMonths")}
          className="w-40"
          options={[
            { label: t("consumption.allMonths"), value: "" },
            ...months.map((m, i) => ({ label: m, value: String(i + 1) })),
          ]}
        />
        <ComboboxSelect
          value={year}
          onValueChange={(v) => { setYear(v); setPage(1) }}
          placeholder={t("consumption.allYears")}
          className="w-32"
          options={[
            { label: t("consumption.allYears"), value: "" },
            ...[CURRENT_YEAR, CURRENT_YEAR - 1, CURRENT_YEAR - 2].map((y) => ({ label: String(y), value: String(y) })),
          ]}
        />
        <ComboboxSelect
          value={meterId}
          onValueChange={(v) => { setMeterId(v); setPage(1) }}
          placeholder={t("consumption.allMeters")}
          className="w-48"
          options={[
            { label: t("consumption.allMeters"), value: "" },
            ...(meters?.items.map((m) => ({ label: m.code, value: m.id })) ?? []),
          ]}
        />
      </div>

      <Card>
        <CardContent className="p-0">
          <DataTable<Consumption>
            columns={[
              {
                key: "meter",
                label: t("consumption.meter"),
                sortable: true,
                render: (c) => (
                  <span className="font-medium">
                    {c.meter ? c.meter.code : c.meter_id.slice(0, 8)}
                    {c.meter?.member ? <span className="block text-xs text-muted-foreground/70 font-normal">{c.meter.member.first_name} {c.meter.member.last_name}</span> : null}
                  </span>
                ),
              },
              { key: "period", label: t("consumption.period"), sortable: true, render: (c) => <span>{months[c.month - 1]} {c.year}</span> },
              { key: "previous_reading", label: t("consumption.previous"), sortable: true, render: (c) => <span className="tabular-nums text-muted-foreground">{c.previous_reading}</span> },
              { key: "current_reading", label: t("consumption.current"), sortable: true, render: (c) => <span className="tabular-nums">{c.current_reading}</span> },
              { key: "cubic_meters", label: t("consumption.usage"), sortable: true, render: (c) => <Badge variant="secondary">{c.cubic_meters} m³</Badge> },
              {
                key: "bill",
                label: t("consumption.bill"),
                render: (c) => {
                  const bill = c.payments?.[0]
                  return bill ? (
                    <div className="flex items-center gap-2">
                      <Badge variant={bill.status === "paid" ? "default" : bill.status === "overdue" ? "destructive" : "outline"}>{bill.status ? t(`common.status.${bill.status}`) : "—"}</Badge>
                      {bill.status === "overdue" && bill.due_date ? <span className="text-xs text-destructive">({Math.floor((NOW_MS - new Date(bill.due_date).getTime()) / 86400000)} {t("consumption.daysOverdue")})</span> : null}
                    </div>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )
                },
              },
              {
                key: "actions",
                label: "",
                className: "w-10",
                stickyRight: true,
                render: (c: Consumption) => {
                  const bill = c.payments?.[0]
                  return bill?.status === "overdue" ? (
                    <RowActions items={
                        [
                            {
                                label: t("consumption.viewBill"),
                                icon: <FileText className="size-4" />,
                                permission: "billing.viewBill",
                                onClick: () => setViewingPayment(bill)
                            }
                        ]}
                    />
                  ) : bill ? null : (
                    <RowActions
                      items={[
                        {
                            label: t("consumption.generateTitle"),
                            icon: <Receipt className="size-4" />, permission: "billing.create", onClick: () => setGenerating(c) },
                        { label: t("common.delete"), icon: <Trash2 className="size-4" />, permission: "consumption.delete", destructive: true, onClick: () => setDeleting(c) },
                      ]}
                    />
                  )
                },
              } as const,
            ]}
            data={data?.items ?? []}
            sort={sort}
            onSort={toggleSort}
            isLoading={isLoading}
            emptyIcon={<BarChart3 className="size-6 text-muted-foreground" />}
            emptyText={t("consumption.noRecords")}
            rowKey={(c) => c.id}
          />
        </CardContent>
      </Card>

      {data ? <DataTablePagination page={data.page} totalPages={data.totalPages} total={data.total} onPageChange={setPage} noun={t("consumption.noun")} /> : null}

      <RecordConsumptionDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
      />
      <GenerateBillDialog
        generating={generating}
        onOpenChange={(open) => {
          if (!open) setGenerating(null)
        }}
      />
      <DeleteConsumptionDialog
        deleting={deleting}
        onOpenChange={(open) => {
          if (!open) setDeleting(null)
        }}
      />
      <PaymentDetailsDialog
        payment={viewingPayment}
        onOpenChange={(open) => {
          if (!open) setViewingPayment(null)
        }}
      />
    </div>
  )
}
