import { useState } from "react"
import { useTranslation } from "react-i18next"
import { Download, Receipt, Search, Wallet } from "lucide-react"
import { formatCurrency, monthNames } from "@/lib/utils"
import type { Payment, PaymentStatus } from "@/lib/types"
import { useAuth } from "@/lib/auth"
import { useSearchBills } from "@/hooks/billing"
import { useMetersSelect } from "@/hooks/meters"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { useTableSort } from "@/hooks/use-sort"
import { RowActions } from "@/components/ui/row-actions"
import { ComboboxSelect } from "@/components/ui/combobox"
import { DataTable } from "@/components/ui/data-table"
import { DataTablePagination } from "@/components/ui/data-table-pagination"
import PayBillDialog from "./PayBillDialog"
import PaymentDetailsDialog from "./PaymentDetailsDialog"
import { STATUS_LABEL, STATUS_VARIANT, memberName, meterCode, remaining, handleDownloadReceipt } from "./helpers"

const CURRENT_YEAR = new Date().getFullYear()

export default function BillingPage() {
  const { hasPermission } = useAuth()
  const { t } = useTranslation()
  const months = monthNames()
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState("")
  const [searchInput, setSearchInput] = useState("")
  const [month, setMonth] = useState<string>("")
  const [year, setYear] = useState<string>("")
  const [status, setStatus] = useState<string>("")
  const [meterId, setMeterId] = useState<string>("")
  const [paying, setPaying] = useState<Payment | null>(null)
  const [details, setDetails] = useState<Payment | null>(null)

  const { data: meters } = useMetersSelect()

  const { sort, toggleSort } = useTableSort(
    { key: "period", order: "desc" },
    () => setPage(1),
  )

  const { data, isLoading } = useSearchBills({
    page,
    month,
    year,
    status: status as PaymentStatus | "",
    search,
    meterId,
    sortBy: sort?.key,
    sortOrder: sort?.order,
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t("billing.title")}</h1>
        <p className="text-sm text-muted-foreground">
          {t("billing.subtitle")}
        </p>
      </div>

      <div className="flex flex-wrap gap-3">
        <div className="relative w-full max-w-sm">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder={t("billing.searchPlaceholder")}
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
          value={meterId}
          onValueChange={(v) => { setMeterId(v); setPage(1) }}
          placeholder={t("billing.allMeters")}
          className="w-48"
          options={[
            { label: t("billing.allMeters"), value: "" },
            ...(meters?.items.map((m) => ({ label: m.code, value: m.id })) ?? []),
          ]}
        />
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
          value={status}
          onValueChange={(v) => { setStatus(v); setPage(1) }}
          placeholder={t("billing.allStatuses")}
          className="w-36"
          options={[
            { label: t("billing.allStatuses"), value: "" },
            ...Object.entries(STATUS_LABEL).map(([k, v]) => ({ label: t(v), value: k })),
          ]}
        />
      </div>

      <Card>
        <CardContent className="p-0">
          <DataTable<Payment>
            columns={[
              { key: "member", label: t("billing.member"), sortable: true, render: (p) => <div><div className="font-medium">{memberName(p)}</div><div className="text-xs text-muted-foreground">{meterCode(p)}</div></div> },
              { key: "period", label: t("billing.period"), sortable: true, render: (p) => <span>{p.consumption ? `${months[p.consumption.month - 1]} ${p.consumption.year}` : "—"}</span> },
              { key: "usage", label: t("billing.usage"), sortable: true, render: (p) => <span>{p.consumption?.cubic_meters ?? "—"} m³</span> },
              {
                key: "discount",
                label: t("billing.discount"),
                render: (p) =>
                  p.paymentDiscounts && p.paymentDiscounts.length > 0 && parseFloat(p.discount_amount) > 0 ? (
                    <div className="flex flex-wrap gap-1">
                      {p.paymentDiscounts.map((pd) => (
                        <Badge key={pd.id} variant="secondary" className="text-xs">
                          {pd.discount?.type === "fixed" ? `-${formatCurrency(pd.amount)}` : `-${pd.discount?.value}%`}
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  ),
              },
              { key: "total_amount", label: t("billing.total"), sortable: true, align: "right", render: (p) => <span className="tabular-nums">{formatCurrency(p.total_amount)}</span> },
              { key: "amount_paid", label: t("billing.paid"), sortable: true, align: "right", render: (p) => <span className="tabular-nums">{formatCurrency(p.amount_paid)}</span> },
              { key: "status", label: t("billing.status"), sortable: true, render: (p) => <Badge variant={STATUS_VARIANT[p.status]}>{t(STATUS_LABEL[p.status])}</Badge> },
              { key: "due_date", label: t("billing.dueDate"), sortable: true, render: (p) => <span className="text-muted-foreground">{p.due_date}</span> },
              {
                key: "actions",
                label: "",
                className: "w-10",
                stickyRight: true,
                render: (p: Payment) => (
                  <div onClick={(e) => e.stopPropagation()}>
                    <RowActions
                      items={[
                        {
                            label: t("billing.downloadReceipt"),
                            icon: <Download className="size-4" />,
                            permission: "billing.download",
                            onClick: () => handleDownloadReceipt(p)
                        },
                        ...(remaining(p) > 0
                            ? [
                                { label: t("billing.pay"),
                                    icon: <Wallet className="size-4" />,
                                    permission: "billing.update",
                                    onClick: () => setPaying(p)
                                }
                              ]
                            : []),
                      ]}
                    />
                  </div>
                ),
              } as const,
            ]}
            data={data?.items ?? []}
            sort={sort}
            onSort={toggleSort}
            isLoading={isLoading}
            emptyIcon={<Receipt className="size-6 text-muted-foreground" />}
            emptyText={t("billing.noBills")}
            rowKey={(p) => p.id}
            onRowClick={(p) => setDetails(p)}
            rowClassName={() => "cursor-pointer"}
          />
        </CardContent>
      </Card>

      {data ? <DataTablePagination page={data.page} totalPages={data.totalPages} total={data.total} onPageChange={setPage} noun={t("billing.noun")} /> : null}

      <PayBillDialog
        payment={paying}
        onOpenChange={(open) => {
          if (!open) setPaying(null)
        }}
      />
      <PaymentDetailsDialog
        payment={details}
        onOpenChange={(open) => {
          if (!open) setDetails(null)
        }}
      />
    </div>
  )
}
