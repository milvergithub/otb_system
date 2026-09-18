import { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Download,
  FileText,
  AlertTriangle,
  Droplets,
  HandCoins,
  CircleDollarSign,
  LineChart,
  CalendarDays,
  Search,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { getApiErrorMessage } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { ApiPath } from "@/lib/apiPath";
import Can from "@/components/Can";
import { api } from "@/lib/api";
import { formatCurrency } from "@/lib/utils";
import type { TFunction } from "i18next";
import type { Fine, FineStatus, Payment } from "@/lib/types";
import { useRevenue, useOverdue, downloadReportCsv } from "@/hooks/reports";
import { useFinesStats, useFinesReport, useActivities } from "@/hooks/activities";
import { useTableSort } from "@/hooks/use-sort";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DatePicker } from "@/components/ui/date-picker";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { ComboboxSelect } from "@/components/ui/combobox";
import { DataTable } from "@/components/ui/data-table";
import { DataTablePagination } from "@/components/ui/data-table-pagination";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useSortedData } from "@/hooks/use-sorted-data";
import { toast } from "sonner";

const now = new Date();
const CURRENT_YEAR = now.getFullYear();
const TODAY = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
const YEAR_START = `${CURRENT_YEAR}-01-01`;

const MONTH_NAMES = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
];

function overdueAccessor(payment: Payment, key: string): unknown {
  switch (key) {
    case "member": {
      const member = payment.consumption?.meter?.member;
      return member ? `${member.first_name} ${member.last_name}` : "";
    }
    case "meter":
      return payment.consumption?.meter?.code ?? "";
    case "period":
      return payment.consumption
        ? payment.consumption.year * 100 + payment.consumption.month
        : null;
    case "balance":
      return parseFloat(payment.total_amount) - parseFloat(payment.amount_paid);
    case "status":
      return payment.status;
    case "due_date":
      return payment.due_date;
    default:
      return null;
  }
}

const FINE_STATUS_VARIANT: Record<
  FineStatus,
  "default" | "secondary" | "destructive" | "outline"
> = {
  pending: "destructive",
  paid: "default",
  cancelled: "secondary",
};

function finesCsvCell(value: unknown): string {
  return `"${String(value ?? "").replace(/"/g, '""')}"`;
}

async function downloadFinesCsv(
  filters: { status?: string; search?: string; activityId?: string },
  t: TFunction,
) {
  const { data: fines } = await api.get<Fine[]>(ApiPath.Fines.BASE, {
    params: {
      status: filters.status || undefined,
      search: filters.search || undefined,
      activityId: filters.activityId || undefined,
    },
  });
  const header = [
    t("reports.member"),
    t("members.ci"),
    t("activities.finesActivity"),
    t("activities.finesType"),
    t("activities.finesAmount"),
    t("reports.status"),
    t("activities.finesDate"),
  ];
  const rows = fines.map((f) => [
    [f.member?.first_name, f.member?.last_name].filter(Boolean).join(" ") ||
      f.member_id,
    f.member?.ci ?? "",
    f.activity?.name ?? f.activity_id,
    f.fineType?.name ?? "",
    f.amount,
    t(`activities.${f.status}`),
    new Date(f.created_at).toLocaleDateString(),
  ]);
  const csv = [header, ...rows]
    .map((row) => row.map(finesCsvCell).join(","))
    .join("\n");
  const blob = new Blob(["\uFEFF" + csv], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "fines-report.csv";
  a.click();
  URL.revokeObjectURL(url);
}

export default function ReportsPage() {
  const { t } = useTranslation();
  const { hasPermission } = useAuth();
  const [dateFrom, setDateFrom] = useState(YEAR_START);
  const [dateTo, setDateTo] = useState(TODAY);

  const { data: revenue, isLoading } = useRevenue(dateFrom, dateTo);

  const { data: overdue, isLoading: overdueLoading } = useOverdue();

  const [fineStatus, setFineStatus] = useState("");
  const [fineSearch, setFineSearch] = useState("");
  const [fineSearchInput, setFineSearchInput] = useState("");
  const [activityId, setActivityId] = useState("");
  const [finePage, setFinePage] = useState(1);

  const { sort: fineSort, toggleSort: toggleFineSort } = useTableSort(
    { key: "created_at", order: "desc" },
    () => setFinePage(1),
  );

  const { data: finesData, isLoading: finesLoading } = useFinesReport({
    page: finePage,
    status: fineStatus,
    search: fineSearch,
    activityId,
    sortBy: fineSort?.key,
    sortOrder: fineSort?.order,
  });
  const { data: fineStats } = useFinesStats();
  const { data: activities } = useActivities();

  const { sort, toggleSort } = useTableSort({ key: "due_date", order: "asc" });

  const sortedOverdue = useSortedData(overdue, sort, overdueAccessor, "due_date", "asc");

  if (!hasPermission("reports.revenue") && !hasPermission("reports.overdue") && !hasPermission("activities.read")) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <p className="text-muted-foreground">{t("common.accessDenied")}</p>
      </div>
    );
  }

  async function exportCsv() {
    try {
      await downloadReportCsv(dateFrom, dateTo);
    } catch (err) {
      toast.error(getApiErrorMessage(err));
    }
  }

  const totalCollected = revenue?.reduce((sum, m) => sum + m.total, 0) ?? 0;
  const totalWater =
    revenue?.reduce((sum, m) => sum + m.waterCollected, 0) ?? 0;
  const totalShares =
    revenue?.reduce((sum, m) => sum + m.shareCollected, 0) ?? 0;

  const chartData =
    revenue?.map((m) => ({
      name: `${MONTH_NAMES[m.month - 1].substring(0, 3)} ${m.year}`,
      Agua: m.waterCollected,
      Acciones: m.shareCollected,
    })) ?? [];

  const billingToolbar = (
    <>
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">
          {t("reports.dateFrom")}
        </span>
        <DatePicker
          value={dateFrom}
          onChange={(v) => setDateFrom(v ?? YEAR_START)}
        />
      </div>
      <div className="flex items-center gap-2">
        <span className="text-sm text-muted-foreground">
          {t("reports.dateTo")}
        </span>
        <DatePicker value={dateTo} onChange={(v) => setDateTo(v ?? TODAY)} />
      </div>
      <Can permission="reports.export">
        <Button onClick={exportCsv}>
          <Download className="mr-2 size-4" />
          {t("reports.exportCsv")}
        </Button>
      </Can>
    </>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t("reports.title")}</h1>
        <p className="text-sm text-muted-foreground">{t("reports.subtitle")}</p>
      </div>

      <Tabs defaultValue="charts" className="space-y-6">
        <TabsList className="rounded-full p-1 h-9">
          <Can permission="reports.revenue">
            <TabsTrigger value="charts" className="rounded-full px-4">
              <span className="flex items-center gap-1">
                <LineChart className="size-4" />
                {t("reports.summaryCharts")}
              </span>
            </TabsTrigger>
          </Can>
          <Can permission="reports.revenue">
            <TabsTrigger value="monthly" className="rounded-full px-4">
              <span className="flex items-center gap-1">
                <CalendarDays className="size-4" />
                {t("reports.monthlyCollections", { year: "" })}
              </span>
            </TabsTrigger>
          </Can>
          <Can permission="reports.overdue">
            <TabsTrigger value="outstanding" className="rounded-full px-4">
              <span className="flex items-center gap-1">
                <AlertTriangle className="size-4" />
                {t("reports.outstandingBalances")}
              </span>
            </TabsTrigger>
          </Can>
          <Can permission="activities.read">
            <TabsTrigger value="fines" className="rounded-full px-4">
              <span className="flex items-center gap-1">
                <CircleDollarSign className="size-4" />
                {t("reports.finesTitle")}
              </span>
            </TabsTrigger>
          </Can>
        </TabsList>

        <Can permission="reports.revenue">
          <TabsContent value="charts" className="space-y-6">
          <div className="flex flex-wrap items-center justify-end gap-2">
            {billingToolbar}
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {t("reports.totalCollected", { year: "" })}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">
                  {isLoading ? "—" : formatCurrency(totalCollected)}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {t("reports.waterCollected")}
                </CardTitle>
                <Droplets className="size-4 text-blue-500" />
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">
                  {isLoading ? "—" : formatCurrency(totalWater)}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {t("reports.shareCollected")}
                </CardTitle>
                <HandCoins className="size-4 text-green-500" />
              </CardHeader>
              <CardContent>
                <p className="text-2xl font-bold">
                  {isLoading ? "—" : formatCurrency(totalShares)}
                </p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>{t("reports.incomeBySource")}</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-64" />
              ) : (
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData}>
                      <CartesianGrid
                        strokeDasharray="3 3"
                        className="stroke-border"
                      />
                      <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                      <YAxis tick={{ fontSize: 12 }} />
                      <Tooltip
                        formatter={(value) => formatCurrency(Number(value))}
                      />
                      <Legend />
                      <Bar
                        dataKey="Agua"
                        stackId="income"
                        fill="hsl(210, 80%, 50%)"
                        radius={[0, 0, 0, 0]}
                      />
                      <Bar
                        dataKey="Acciones"
                        stackId="income"
                        fill="hsl(142, 70%, 45%)"
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        </Can>

        <Can permission="reports.revenue">
        <TabsContent value="monthly" className="space-y-6">
          <div className="flex flex-wrap items-center justify-end gap-2">
            {billingToolbar}
          </div>

          <Card>
            <CardHeader>
              <CardTitle>
                {t("reports.monthlyCollections", { year: "" })}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <DataTable
                columns={[
                  { key: "month", label: t("reports.month"), render: (m: { year: number; month: number; waterCollected: number; shareCollected: number; total: number; billed: number }) => <span className="font-medium">{MONTH_NAMES[m.month - 1]} {m.year}</span> },
                  { key: "waterCollected", label: t("reports.waterCollected"), align: "right", render: (m) => <span className="tabular-nums">{formatCurrency(m.waterCollected)}</span> },
                  { key: "shareCollected", label: t("reports.shareCollected"), align: "right", render: (m) => <span className="tabular-nums">{formatCurrency(m.shareCollected)}</span> },
                  { key: "collected", label: t("reports.collected"), align: "right", render: (m) => <span className="tabular-nums font-medium">{formatCurrency(m.total)}</span> },
                  { key: "billed", label: t("reports.billed"), align: "right", render: (m) => <span className="tabular-nums">{formatCurrency(m.billed)}</span> },
                  { key: "rate", label: t("reports.rate"), align: "right", render: (m) => <span>{m.billed > 0 ? `${((m.total / m.billed) * 100).toFixed(1)}%` : "—"}</span> },
                ]}
                data={revenue ?? []}
                isLoading={isLoading}
                emptyText={t("common.noData")}
                rowKey={(m) => `${m.year}-${m.month}`}
              />
            </CardContent>
          </Card>
        </TabsContent>
        </Can>

        <Can permission="reports.overdue">
        <TabsContent value="outstanding" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="size-4 text-destructive" />
                {t("reports.outstandingTitle")}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <DataTable<Payment>
                columns={[
                  { key: "member", label: t("reports.member"), sortable: true, render: (p) => { const m = p.consumption?.meter?.member; return <span className="font-medium">{m ? `${m.first_name} ${m.last_name}` : "—"}</span> } },
                  { key: "meter", label: t("reports.meter"), sortable: true, render: (p) => <span className="font-mono">{p.consumption?.meter?.code ?? "—"}</span> },
                  { key: "period", label: t("reports.period"), sortable: true, render: (p) => <span>{p.consumption ? `${MONTH_NAMES[p.consumption.month - 1]} ${p.consumption.year}` : "—"}</span> },
                  { key: "balance", label: t("reports.balance"), sortable: true, align: "right", render: (p) => <span className="tabular-nums font-semibold text-destructive">{formatCurrency(parseFloat(p.total_amount) - parseFloat(p.amount_paid))}</span> },
                  { key: "status", label: t("reports.status"), sortable: true, render: (p) => <Badge variant={p.status === "overdue" ? "destructive" : "outline"}>{t(`common.status.${p.status}`)}</Badge> },
                  { key: "due_date", label: t("reports.dueDate"), sortable: true, render: (p) => <span>{p.due_date}</span> },
                ]}
                data={sortedOverdue}
                sort={sort}
                onSort={toggleSort}
                isLoading={overdueLoading}
                emptyIcon={<FileText className="size-6 text-muted-foreground" />}
                emptyText={t("reports.noOutstanding")}
                rowKey={(p) => p.id}
              />
            </CardContent>
          </Card>
        </TabsContent>
        </Can>

        <Can permission="activities.read">
        <TabsContent value="fines" className="space-y-6">
          <Card>
            <CardHeader className="pb-2">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <CardTitle className="flex items-center gap-2">
                  <CircleDollarSign className="size-4 text-primary" />
                  {t("reports.finesTitle")}
                </CardTitle>
                <div className="flex flex-wrap items-center gap-2">
                  <div className="relative w-56">
                    <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      className="pl-9"
                      placeholder={t("reports.finesMemberPlaceholder")}
                      value={fineSearchInput}
                      onChange={(e) => setFineSearchInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          setFineSearch(fineSearchInput.trim());
                          setFinePage(1);
                        }
                      }}
                    />
                  </div>
                  <ComboboxSelect
                    value={activityId}
                    onValueChange={(v) => { setActivityId(v); setFinePage(1); }}
                    placeholder={t("reports.finesActivityPlaceholder")}
                    className="w-48"
                    options={[
                      { label: t("reports.finesActivityPlaceholder"), value: "" },
                      ...(activities?.map((a) => ({ label: a.name, value: a.id })) ?? []),
                    ]}
                  />
                  <ComboboxSelect
                    value={fineStatus}
                    onValueChange={(v) => { setFineStatus(v); setFinePage(1); }}
                    placeholder={t("reports.finesStatusPlaceholder")}
                    className="w-40"
                    options={[
                      { label: t("reports.finesStatusPlaceholder"), value: "" },
                      { label: t("activities.pending"), value: "pending" },
                      { label: t("activities.paid"), value: "paid" },
                      { label: t("activities.cancelled"), value: "cancelled" },
                    ]}
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      downloadFinesCsv(
                        { status: fineStatus, search: fineSearch, activityId },
                        t,
                      ).catch((err) => toast.error(getApiErrorMessage(err)));
                    }}
                  >
                    <Download className="mr-2 size-4" />
                    {t("reports.exportFinesCsv")}
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="grid gap-4 p-4 sm:grid-cols-2 lg:grid-cols-5">
                <Card>
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold">
                      {fineStats?.total ?? 0}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {t("activities.total")}
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-red-600">
                      {fineStats?.pending ?? 0}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {t("activities.pending")}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {formatCurrency(
                        parseFloat(fineStats?.pendingAmount ?? "0"),
                      )}
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {fineStats?.paid ?? 0}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {t("activities.paid")}
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold text-muted-foreground">
                      {fineStats?.cancelled ?? 0}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {t("activities.cancelled")}
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-4 text-center">
                    <div className="text-2xl font-bold">
                      {formatCurrency(
                        parseFloat(fineStats?.totalAmount ?? "0"),
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {t("reports.finesAmountTotal")}
                    </div>
                  </CardContent>
                </Card>
              </div>
              <DataTable<Fine>
                columns={[
                  {
                    key: "member",
                    label: t("reports.member"),
                    sortable: true,
                    render: (f) => {
                      const memberName = [
                        f.member?.first_name,
                        f.member?.last_name,
                      ]
                        .filter(Boolean)
                        .join(" ");
                      return (
                        <div>
                          <div className="font-medium">
                            {memberName || f.member_id}
                          </div>
                          {f.member?.ci && (
                            <div className="text-xs text-muted-foreground">
                              {f.member.ci}
                            </div>
                          )}
                        </div>
                      );
                    },
                  },
                  {
                    key: "activity",
                    label: t("activities.finesActivity"),
                    sortable: true,
                    render: (f) => f.activity?.name ?? f.activity_id,
                  },
                  {
                    key: "type",
                    label: t("activities.finesType"),
                    sortable: true,
                    render: (f) => (
                      <span className="text-muted-foreground">
                        {f.fineType?.name ?? "-"}
                      </span>
                    ),
                  },
                  {
                    key: "amount",
                    label: t("activities.finesAmount"),
                    sortable: true,
                    align: "right",
                    render: (f) => (
                      <span className="tabular-nums font-semibold">
                        {formatCurrency(parseFloat(f.amount))}
                      </span>
                    ),
                  },
                  {
                    key: "status",
                    label: t("reports.status"),
                    sortable: true,
                    render: (f) => (
                      <Badge variant={FINE_STATUS_VARIANT[f.status]} className="mt-1">
                        {t(`activities.${f.status}`)}
                      </Badge>
                    ),
                  },
                  {
                    key: "created_at",
                    label: t("activities.finesDate"),
                    sortable: true,
                    render: (f) => (
                      <span className="text-muted-foreground">
                        {new Date(f.created_at).toLocaleDateString()}
                      </span>
                    ),
                  },
                ]}
                data={finesData?.items ?? []}
                sort={fineSort}
                onSort={toggleFineSort}
                isLoading={finesLoading}
                emptyIcon={<CircleDollarSign className="size-6 text-muted-foreground" />}
                emptyText={t("reports.noFines")}
                rowKey={(f) => f.id}
              />
            </CardContent>
          </Card>

          {finesData ? (
            <DataTablePagination
              page={finesData.page}
              totalPages={finesData.totalPages}
              total={finesData.total}
              onPageChange={setFinePage}
              noun={t("reports.finesNoun")}
            />
          ) : null}
        </TabsContent>
        </Can>
      </Tabs>
    </div>
  );
}
