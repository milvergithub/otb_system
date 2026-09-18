import { useQuery } from "@tanstack/react-query"
import { api } from "@/lib/api"
import { ApiPath } from "@/lib/apiPath"
import { queryKeys } from "@/lib/utils/query"
import type { Dashboard, MonthlyRevenue, Payment } from "@/lib/types"

export function useDashboard() {
  return useQuery<Dashboard>({
    queryKey: queryKeys.dashboard,
    queryFn: () => api.get(ApiPath.Reports.DASHBOARD).then((r) => r.data),
  })
}

export function useRevenue(startDate: string, endDate: string) {
  return useQuery<MonthlyRevenue[]>({
    queryKey: queryKeys.reports.revenue(startDate, endDate),
    queryFn: () =>
      api
        .get(ApiPath.Reports.REVENUE, { params: { startDate, endDate } })
        .then((r) => r.data),
  })
}

export function useOverdue() {
  return useQuery<Payment[]>({
    queryKey: queryKeys.reports.overdue,
    queryFn: () => api.get(ApiPath.Reports.OVERDUE).then((r) => r.data),
  })
}

export async function downloadReportCsv(startDate: string, endDate: string) {
  const res = await api.get(ApiPath.Reports.EXPORT, {
    params: { startDate, endDate },
    responseType: "blob",
  })
  const url = URL.createObjectURL(res.data)
  const a = document.createElement("a")
  a.href = url
  a.download = `billing-report-${startDate}-to-${endDate}.csv`
  a.click()
  URL.revokeObjectURL(url)
}
