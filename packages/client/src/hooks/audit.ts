import { useQuery } from "@tanstack/react-query"
import { api } from "@/lib/api"
import { ApiPath } from "@/lib/apiPath"
import { queryKeys } from "@/lib/utils/query"
import type { Paginated, AuditLog } from "@/lib/types"

export interface AuditSearchParams {
  page: number
  search?: string
  entity?: string
  action?: string
  userId?: string
  entityId?: string
  dateFrom?: string
  dateTo?: string
  sortBy?: string
  sortOrder?: string
}

export function useAuditLogs({
  page,
  search = "",
  entity = "",
  action = "",
  userId = "",
  entityId = "",
  dateFrom = "",
  dateTo = "",
  sortBy = "",
  sortOrder = "",
}: AuditSearchParams) {
  return useQuery<Paginated<AuditLog>>({
    queryKey: queryKeys.audit.list(
      page,
      search,
      entity,
      action,
      userId,
      sortBy,
      sortOrder,
    ),
    queryFn: () =>
      api
        .get(ApiPath.Audit.BASE, {
          params: {
            page,
            limit: 20,
            entity: entity || undefined,
            action: action || undefined,
            userId: userId || undefined,
            entityId: entityId || undefined,
            dateFrom: dateFrom || undefined,
            dateTo: dateTo || undefined,
            sortBy: sortBy || undefined,
            sortOrder: sortOrder || undefined,
          },
        })
        .then((r) => r.data),
  })
}

export async function exportAuditCsv(params: {
  entity?: string
  action?: string
  userId?: string
  entityId?: string
  dateFrom?: string
  dateTo?: string
}): Promise<void> {
  const res = await api.get(ApiPath.Audit.EXPORT, {
    params,
    responseType: "blob",
  })
  const url = URL.createObjectURL(res.data)
  const a = document.createElement("a")
  a.href = url
  a.download = "audit-logs.csv"
  a.click()
  URL.revokeObjectURL(url)
}
