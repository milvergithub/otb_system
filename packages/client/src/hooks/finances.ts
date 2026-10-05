import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { api } from "@/lib/api"
import { ApiPath } from "@/lib/apiPath"
import { queryKeys } from "@/lib/utils/query"
import type { SortOrder } from "@/components/ui/sortable-header"
import type {
  FinanceCategory,
  FinanceDocument,
  FinanceTransaction,
  FinanceTransactionStatus,
  FinanceTransactionType,
  PaymentMethod,
  FinanceSourceType,
  Paginated,
} from "@/lib/types"

export interface SearchFinancesParams {
  page: number
  search?: string
  type?: FinanceTransactionType | ""
  categoryId?: string
  memberId?: string
  userId?: string
  assetId?: string
  sourceType?: FinanceSourceType | ""
  dateFrom?: string
  dateTo?: string
  sortBy?: string
  sortOrder?: SortOrder
}

export function useSearchFinances(params: SearchFinancesParams) {
  return useQuery<Paginated<FinanceTransaction>>({
    queryKey: queryKeys.finances.list(
      params.page,
      params.type ?? "",
      params.search ?? "",
      params.categoryId ?? "",
      params.memberId ?? "",
      params.userId ?? "",
      params.assetId ?? "",
      params.sourceType ?? "",
      params.dateFrom ?? "",
      params.dateTo ?? "",
      params.sortBy ?? "",
      params.sortOrder ?? "",
    ),
    queryFn: () =>
      api
        .get(ApiPath.Finances.BASE, {
          params: {
            page: params.page,
            limit: 10,
            search: params.search || undefined,
            type: params.type || undefined,
            categoryId: params.categoryId || undefined,
            memberId: params.memberId || undefined,
            userId: params.userId || undefined,
            assetId: params.assetId || undefined,
            sourceType: params.sourceType || undefined,
            dateFrom: params.dateFrom || undefined,
            dateTo: params.dateTo || undefined,
            sortBy: params.sortBy || undefined,
            sortOrder: params.sortOrder ? params.sortOrder.toUpperCase() : undefined,
          },
        })
        .then((r) => r.data),
  })
}

export function useGetFinanceTransaction(id: string | undefined, enabled = true) {
  return useQuery<FinanceTransaction>({
    queryKey: queryKeys.finances.detail(id ?? ""),
    queryFn: () => api.get(ApiPath.Finances.ONE(id!), { params: { details: true } }).then((r) => r.data),
    enabled: enabled && !!id,
  })
}

export function useFinanceCategories() {
  return useQuery<FinanceCategory[]>({
    queryKey: queryKeys.finances.categories,
    queryFn: () => api.get(ApiPath.FinanceCategories.BASE).then((r) => r.data),
  })
}

export function useFinanceDocuments(transactionId: string | undefined, enabled = true) {
  return useQuery<FinanceDocument[]>({
    queryKey: [...queryKeys.finances.detail(transactionId ?? ""), 'documents'] as const,
    queryFn: () => api.get(ApiPath.Finances.DOCUMENTS(transactionId!)).then((r) => r.data),
    enabled: enabled && !!transactionId,
  })
}

export interface FinanceTransactionRequest {
  type: FinanceTransactionType
  date: string
  amount: number
  concept: string
  categoryId?: string
  paymentMethod?: PaymentMethod
  reference?: string
  memberId?: string
  sourceType?: FinanceSourceType
  sourceId?: string
  userId?: string
  provider?: string
  assetId?: string
  notes?: string
}

export function useAddFinanceTransaction() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: FinanceTransactionRequest) =>
      api.post(ApiPath.Finances.BASE, payload).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.finances.all })
    },
  })
}

export function useEditFinanceTransaction() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...payload }: { id: string } & Partial<FinanceTransactionRequest>) =>
      api.patch(ApiPath.Finances.ONE(id), payload).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.finances.all })
    },
  })
}

export function useVoidFinanceTransaction() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) =>
      api.post(ApiPath.Finances.VOID(id), { reason }).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.finances.all })
    },
  })
}

export function useAddFinanceDocument() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: { id: string; fileBase64: string; fileName?: string; kind?: string }) => {
      const { id, ...body } = payload
      return api.post(ApiPath.Finances.DOCUMENTS(id), body).then((r) => r.data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.finances.all })
    },
  })
}

export function useDeleteFinanceDocument() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: { id: string; documentId: string }) => {
      const { id, documentId } = payload
      return api.delete(ApiPath.Finances.DOCUMENT(id, documentId)).then((r) => r.data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.finances.all })
    },
  })
}

export function useFinanceReportSummary(startDate?: string, endDate?: string, enabled = true) {
  return useQuery<{
    income: number
    expense: number
    balance: number
    voided: number
  }>({
    queryKey: queryKeys.finances.reportsSummary(startDate ?? "", endDate ?? ""),
    queryFn: () =>
      api
        .get(ApiPath.Finances.REPORTS_SUMMARY, { params: { startDate, endDate } })
        .then((r) => r.data),
    enabled,
  })
}

export function useFinanceReportByCategory(startDate?: string, endDate?: string, type?: string, enabled = true) {
  return useQuery<{ type: string; category: string; total: number }[]>({
    queryKey: queryKeys.finances.reportsByCategory(startDate ?? "", endDate ?? "", type ?? ""),
    queryFn: () =>
      api
        .get(ApiPath.Finances.REPORTS_BY_CATEGORY, { params: { startDate, endDate, type: type || undefined } })
        .then((r) => r.data),
    enabled,
  })
}

export function useFinanceReportByMethod(startDate?: string, endDate?: string, enabled = true) {
  return useQuery<{ method: string; total: number }[]>({
    queryKey: queryKeys.finances.reportsByMethod(startDate ?? "", endDate ?? ""),
    queryFn: () =>
      api.get(ApiPath.Finances.REPORTS_BY_METHOD, { params: { startDate, endDate } }).then((r) => r.data),
    enabled,
  })
}

export function useFinanceReportMonthly(startDate?: string, endDate?: string, enabled = true) {
  return useQuery<{ year: number; month: number; type: string; total: number }[]>({
    queryKey: queryKeys.finances.reportsMonthly(startDate ?? "", endDate ?? ""),
    queryFn: () =>
      api.get(ApiPath.Finances.REPORTS_MONTHLY, { params: { startDate, endDate } }).then((r) => r.data),
    enabled,
  })
}

export function useFinanceReportWater(startDate?: string, endDate?: string, enabled = true) {
  return useQuery<{ billed: number; collected: number; pending: number; source?: string }>({
    queryKey: queryKeys.finances.reportsWater(startDate ?? "", endDate ?? ""),
    queryFn: () =>
      api.get(ApiPath.Finances.REPORTS_WATER, { params: { startDate, endDate } }).then((r) => r.data),
    enabled,
  })
}

export async function downloadFinanceCsv(startDate?: string, endDate?: string) {
  const res = await api.get(ApiPath.Finances.REPORTS_EXPORT, {
    params: { startDate, endDate },
    responseType: "blob",
  })
  const url = URL.createObjectURL(res.data)
  const a = document.createElement("a")
  a.href = url
  a.download = `finance-report-${startDate ?? "start"}-to-${endDate ?? "today"}.csv`
  a.click()
  URL.revokeObjectURL(url)
}
