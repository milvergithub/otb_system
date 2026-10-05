import { useState, type FormEvent } from "react"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"
import { Ban, Eye, Pencil } from "lucide-react"
import { formatCurrency } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { DataTable, type DataTableColumn } from "@/components/ui/data-table"
import { RowActions } from "@/components/ui/row-actions"
import { DataTablePagination } from "@/components/ui/data-table-pagination"
import { DatePicker } from "@/components/ui/date-picker"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ComboboxSelect } from "@/components/ui/combobox"
import { useTableSort } from "@/hooks/use-sort"
import {
  useSearchFinances,
  useFinanceCategories,
  useFinanceReportSummary,
  useFinanceReportByCategory,
  useFinanceReportByMethod,
  useFinanceReportMonthly,
  useFinanceReportWater,
  downloadFinanceCsv,
} from "@/hooks/finances"
import type { FinanceTransaction } from "@/lib/types"
import FinanceTransactionFormDialog from "./FinanceTransactionFormDialog"
import FinanceTransactionDetailSheet from "./FinanceDetailSheet"
import VoidFinanceTransactionDialog from "./VoidFinanceTransactionDialog"
import { TRANSACTION_TYPE_LABEL, SOURCE_LABEL, METHOD_LABEL } from "./constants"
import Can from "@/components/Can"

type Tab = "transactions" | "reports"

export default function FinancesPage() {
  const { t } = useTranslation()
  const [tab, setTab] = useState<Tab>("transactions")
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState("")
  const [searchInput, setSearchInput] = useState("")
  const [typeFilter, setTypeFilter] = useState<"" | "income" | "expense">("")
  const [categoryId, setCategoryId] = useState("")
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editing, setEditing] = useState<FinanceTransaction | null>(null)
  const [detailTransaction, setDetailTransaction] = useState<FinanceTransaction | null>(null)
  const [voidTransaction, setVoidTransaction] = useState<FinanceTransaction | null>(null)

  const { sort, toggleSort } = useTableSort({ key: "date", order: "desc" }, () => setPage(1))
  const { data, isLoading } = useSearchFinances({ page, search, type: typeFilter, categoryId, dateFrom, dateTo, sortBy: sort?.key, sortOrder: sort?.order })
  const { data: categories } = useFinanceCategories()

  const items = data?.items ?? []
  const totalPages = data?.totalPages ?? 1
  const total = data?.total ?? 0

  function handleSearch(e: FormEvent) {
    e.preventDefault()
    setSearch(searchInput)
    setPage(1)
  }

  const columns: DataTableColumn<FinanceTransaction>[] = [
    { key: "date", label: t("finances.date"), sortable: true, render: (row: FinanceTransaction) => <span>{row.date.slice(0, 10)}</span> },
    { key: "type", label: t("finances.typeLabel"), sortable: true, render: (row: FinanceTransaction) => <Badge variant={row.type === "income" ? "default" : "destructive"}>{t(TRANSACTION_TYPE_LABEL[row.type])}</Badge> },
    { key: "concept", label: t("finances.concept"), sortable: true, render: (row: FinanceTransaction) => <span>{row.concept}</span> },
    { key: "amount", label: t("finances.amount"), sortable: true, align: "right", render: (row: FinanceTransaction) => <span className="font-medium">{formatCurrency(row.amount)}</span> },
    { key: "payment_method", label: t("finances.paymentMethod"), sortable: false, render: (row: FinanceTransaction) => <span>{row.payment_method ? t(METHOD_LABEL[row.payment_method]) : t("common.none")}</span> },
    { key: "category", label: t("finances.category"), sortable: false, render: (row: FinanceTransaction) => <span>{row.category?.name ?? (row.category_id ? t("finances.uncategorized") : t("common.none"))}</span> },
    { key: "source_type", label: t("finances.sourceType"), render: (row: FinanceTransaction) => <span>{row.source_type ? t(SOURCE_LABEL[row.source_type]) : t("common.none")}</span> },
    { key: "status", label: t("finances.statusLabel"), render: (row: FinanceTransaction) => <Badge variant={row.status === "active" ? "default" : "secondary"}>{t(row.status === "active" ? "finances.status.active" : "finances.status.voided")}</Badge> },
    {
      key: "actions",
      label: "",
      className: "w-10",
      stickyRight: true,
      render: (row: FinanceTransaction) => (
          <div onClick={(e) => e.stopPropagation()}>
            <RowActions
                items={[
                  {
                    label: t("common.view"),
                    icon: <Eye className="size-4" />,
                    permission: "finances.read",
                    onClick: () => setDetailTransaction(row),
                  },
                  ...(row.status === "active"
                      ? [
                        {
                          label: t("common.edit"),
                          icon: <Pencil className="size-4" />,
                          permission: "finances.update",
                          onClick: () => { setEditing(row); setDialogOpen(true) },
                        },
                        {
                          label: t("finances.void"),
                          icon: <Ban className="size-4" />,
                          permission: "finances.void",
                          onClick: () => setVoidTransaction(row),
                        },
                      ]
                      : []),
                ]}
            />
          </div>
      ),
    },
  ]

  return (
    <div className="space-y-4 p-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{t("finances.title")}</h1>
        <Can permission="finances.create">
          <Button onClick={() => { setEditing(null); setDialogOpen(true) }}>{t("finances.newTransaction")}</Button>
        </Can>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as Tab)}>
        <TabsList>
          <TabsTrigger value="transactions">{t("finances.tabs.transactions")}</TabsTrigger>
          <TabsTrigger value="reports">{t("finances.tabs.reports")}</TabsTrigger>
        </TabsList>

        <TabsContent value="transactions" className="space-y-4">
          <Card>
            <CardContent className="p-4 space-y-4">
              <form onSubmit={handleSearch} className="flex flex-wrap items-end gap-4">
                <div>
                  <Label htmlFor="search">{t("common.search")}</Label>
                  <Input id="search" value={searchInput} onChange={(e) => setSearchInput(e.target.value)} placeholder={t("finances.searchPlaceholder")} />
                </div>
                <div>
                  <Label>{t("finances.typeLabel")}</Label>
                  <ComboboxSelect value={typeFilter} onValueChange={(v) => { setTypeFilter(v as typeof typeFilter); setPage(1) }} options={[{ label: t("common.all"), value: "" }, { label: t("finances.type.income"), value: "income" }, { label: t("finances.type.expense"), value: "expense" }]} placeholder={t("finances.typeLabel")} />
                </div>
                <div>
                  <Label>{t("finances.category")}</Label>
                  <ComboboxSelect value={categoryId} onValueChange={setCategoryId} options={[{ label: t("common.all"), value: "" }, ...(categories?.map((c) => ({ label: c.name, value: c.id })) ?? [])]} placeholder={t("finances.allCategories")} />
                </div>
                <div>
                  <Label>{t("finances.dateFrom")}</Label>
                  <DatePicker value={dateFrom} onChange={setDateFrom} />
                </div>
                <div>
                  <Label>{t("finances.dateTo")}</Label>
                  <DatePicker value={dateTo} onChange={setDateTo} />
                </div>
                <Button type="submit" variant="outline">{t("common.filter")}</Button>
              </form>

              <DataTable
                columns={columns}
                data={items}
                rowKey={(row: FinanceTransaction) => row.id}
                isLoading={isLoading}
                emptyText={t("finances.empty")}
                sort={sort}
                onSort={toggleSort}
              />

              <DataTablePagination page={page} total={total} totalPages={totalPages} onPageChange={setPage} noun={t("finances.transaction")} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reports" className="space-y-4">
          <ReportsPanel />
        </TabsContent>
      </Tabs>

      <FinanceTransactionFormDialog open={dialogOpen} onOpenChange={setDialogOpen} editing={editing} />
      <FinanceTransactionDetailSheet transaction={detailTransaction} onOpenChange={(open) => !open && setDetailTransaction(null)} />
      <VoidFinanceTransactionDialog transaction={voidTransaction} onOpenChange={(open) => !open && setVoidTransaction(null)} />
    </div>
  )
}

function ReportsPanel() {
  const { t } = useTranslation()
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const { data: summary, isLoading: summaryLoading } = useFinanceReportSummary(startDate || undefined, endDate || undefined)
  const { data: byCategory } = useFinanceReportByCategory(startDate || undefined, endDate || undefined)
  const { data: byMethod } = useFinanceReportByMethod(startDate || undefined, endDate || undefined)
  const { data: monthly } = useFinanceReportMonthly(startDate || undefined, endDate || undefined)
  const { data: water } = useFinanceReportWater(startDate || undefined, endDate || undefined)
  const [exporting, setExporting] = useState(false)

  async function handleExport() {
    try {
      setExporting(true)
      await downloadFinanceCsv(startDate || undefined, endDate || undefined)
    } catch {
      toast.error(t("common.error"))
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-4">
        <div>
          <Label>{t("finances.startDate")}</Label>
          <DatePicker value={startDate} onChange={setStartDate} />
        </div>
        <div>
          <Label>{t("finances.endDate")}</Label>
          <DatePicker value={endDate} onChange={setEndDate} />
        </div>
        <Can permission="finances.export">
          <Button variant="outline" onClick={handleExport} disabled={exporting}>
            {exporting ? t("common.loading") : t("finances.exportCsv")}
          </Button>
        </Can>
      </div>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <Card><CardContent className="p-4"><div className="text-muted-foreground text-sm">{t("finances.income")}</div><div className="text-2xl font-semibold">{summaryLoading ? "…" : summary?.income ?? 0}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-muted-foreground text-sm">{t("finances.expense")}</div><div className="text-2xl font-semibold">{summaryLoading ? "…" : summary?.expense ?? 0}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-muted-foreground text-sm">{t("finances.balance")}</div><div className="text-2xl font-semibold">{summaryLoading ? "…" : summary?.balance ?? 0}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-muted-foreground text-sm">{t("finances.voidedCount")}</div><div className="text-2xl font-semibold">{summary?.voided ?? 0}</div></CardContent></Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardContent className="p-4 space-y-2">
            <h3 className="font-medium">{t("finances.byCategory")}</h3>
            <div className="space-y-1">
              {byCategory?.map((r) => (
                <div key={`${r.type}-${r.category}`} className="flex justify-between text-sm">
                  <span>{r.category}</span>
                  <span>{r.total}</span>
                </div>
              )) ?? <span className="text-muted-foreground text-sm">{t("common.noData")}</span>}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 space-y-2">
            <h3 className="font-medium">{t("finances.byMethod")}</h3>
            <div className="space-y-1">
              {byMethod?.map((r) => (
                <div key={r.method} className="flex justify-between text-sm">
                  <span>{r.method}</span>
                  <span>{r.total}</span>
                </div>
              )) ?? <span className="text-muted-foreground text-sm">{t("common.noData")}</span>}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-4">
          <h3 className="font-medium mb-2">{t("finances.monthly")}</h3>
          <div className="space-y-1">
            {monthly?.map((r) => (
              <div key={`${r.year}-${r.month}-${r.type}`} className="grid grid-cols-4 text-sm">
                <span>{r.year}/{r.month}</span>
                <span>{r.type}</span>
                <span className="text-right">{r.total}</span>
              </div>
            )) ?? <span className="text-muted-foreground text-sm">{t("common.noData")}</span>}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <h3 className="font-medium mb-2">{t("finances.waterReport")}</h3>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div><div className="text-muted-foreground">{t("finances.billed")}</div><div>{water?.billed ?? 0}</div></div>
            <div><div className="text-muted-foreground">{t("finances.collected")}</div><div>{water?.collected ?? 0}</div></div>
            <div><div className="text-muted-foreground">{t("finances.pending")}</div><div>{water?.pending ?? 0}</div></div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}


