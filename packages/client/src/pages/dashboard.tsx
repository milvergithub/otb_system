import { useTranslation } from "react-i18next"
import { useState } from "react"
import { DatePicker } from "@/components/ui/date-picker"
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import {
  AlertTriangle,
  CircleCheck,
  Clock,
  Droplets,
  Gauge,
  TrendingUp,
  Users,
} from "lucide-react"
import { formatCurrency, monthNames } from "@/lib/utils"
import { useAuth } from "@/lib/auth"
import { useDashboard, useRevenue } from "@/hooks/reports"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Badge } from "@/components/ui/badge"

function StatCard({
  title,
  value,
  icon: Icon,
  hint,
}: {
  title: string
  value: string
  icon: React.ElementType
  hint?: string
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <div className="rounded-md bg-primary/10 p-2 text-primary">
          <Icon className="size-4" />
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-2xl font-bold">{value}</p>
        {hint ? (
          <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
        ) : null}
      </CardContent>
    </Card>
  )
}

export default function DashboardPage() {
  const { t } = useTranslation()
  const { hasPermission } = useAuth()
  const months = monthNames()
  const now = new Date()
  const [dateFrom, setDateFrom] = useState(`${now.getFullYear()}-01-01`)
  const [dateTo, setDateTo] = useState(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`)
  const { data: dashboard, isLoading } = useDashboard(dateFrom, dateTo)

  const { data: revenue, isLoading: revenueLoading } = useRevenue(dateFrom, dateTo)

  if (!hasPermission("reports.dashboard")) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <p className="text-muted-foreground">{t("common.accessDenied")}</p>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
      </div>
    )
  }

  const chartData = (revenue ?? []).map((m) => ({
    name: months[m.month - 1].slice(0, 3),
    Collected: m.total,
    Billed: m.billed,
  }))

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">{t("dashboard.title")}</h1>
        <p className="text-sm text-muted-foreground">
          {t("dashboard.overview", {
            startDate: dashboard!.startDate,
            endDate: dashboard!.endDate,
          })}
        </p>
        <div className="flex items-center gap-4 mt-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">{t("reports.dateFrom")}</span>
            <DatePicker
              value={dateFrom}
              onChange={(v) => setDateFrom(v ?? `${now.getFullYear()}-01-01`)}
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">{t("reports.dateTo")}</span>
            <DatePicker
              value={dateTo}
              onChange={(v) => setDateTo(v ?? `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`)}
            />
          </div>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title={t("dashboard.members")}
          value={String(dashboard!.totalMembers)}
          icon={Users}
        />
        <StatCard
          title={t("dashboard.meters")}
          value={String(dashboard!.totalMeters)}
          icon={Gauge}
        />
        <StatCard
          title={t("dashboard.collected")}
          value={formatCurrency(dashboard!.totalCollected)}
          hint={`${t("dashboard.ofBilled", {
            amount: formatCurrency(dashboard!.totalBilled),
          })}${
            dashboard!.shareCollected > 0
              ? ` · ${t("dashboard.fromShares", {
                  amount: formatCurrency(dashboard!.shareCollected),
                })}`
              : ""
          }`}
          icon={TrendingUp}
        />
        <StatCard
          title={t("dashboard.totalConsumption")}
          value={`${dashboard!.totalConsumption} m³`}
          icon={Droplets}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t("dashboard.collectionRate")}
            </CardTitle>
            <div className="rounded-md bg-green-500/10 p-2 text-green-600">
              <CircleCheck className="size-4" />
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{dashboard!.collectionRate}%</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t("dashboard.pendingBills")}
            </CardTitle>
            <div className="rounded-md bg-yellow-500/10 p-2 text-yellow-600">
              <Clock className="size-4" />
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{dashboard!.pendingCount}</p>
            <Badge variant="outline" className="mt-2">
              {t("dashboard.overdue", { count: dashboard!.overdueCount })}
            </Badge>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t("dashboard.overdueCard")}
            </CardTitle>
            <div className="rounded-md bg-red-500/10 p-2 text-red-600">
              <AlertTriangle className="size-4" />
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{dashboard!.overdueCount}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("dashboard.monthlyRevenue")}</CardTitle>
        </CardHeader>
        <CardContent>
          {revenueLoading ? (
            <Skeleton className="h-64" />
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="collected" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(210, 80%, 30%)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(210, 80%, 30%)" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="billed" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(160, 60%, 45%)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(160, 60%, 45%)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip
                    formatter={(value) => formatCurrency(Number(value))}
                  />
                  <Area
                    type="monotone"
                    dataKey="Billed"
                    stroke="hsl(160, 60%, 45%)"
                    fill="url(#billed)"
                  />
                  <Area
                    type="monotone"
                    dataKey="Collected"
                    stroke="hsl(210, 80%, 30%)"
                    fill="url(#collected)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
