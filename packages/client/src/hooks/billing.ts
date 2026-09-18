import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { api } from "@/lib/api"
import { ApiPath } from "@/lib/apiPath"
import { queryKeys } from "@/lib/utils/query"
import type { SortOrder } from "@/components/ui/sortable-header"
import type {
  Discount,
  DiscountType,
  Paginated,
  Payment,
  PaymentStatus,
} from "@/lib/types"

export function useActiveDiscounts() {
  return useQuery<Discount[]>({
    queryKey: queryKeys.billing.discountsActive,
    queryFn: () => api.get(ApiPath.Billing.DISCOUNTS_ACTIVE).then((r) => r.data),
  })
}

export interface SearchBillsParams {
  page: number
  month?: string
  year?: string
  status?: PaymentStatus | ""
  search?: string
  meterId?: string
  sortBy?: string
  sortOrder?: SortOrder
}

export function useSearchBills({ page, month, year, status, search, meterId, sortBy, sortOrder }: SearchBillsParams) {
  return useQuery<Paginated<Payment>>({
    queryKey: queryKeys.billing.list(
      page,
      month ?? "",
      year ?? "",
      status ?? "",
      search ?? "",
      meterId ?? "",
      sortBy ?? "",
      sortOrder ?? "",
    ),
    queryFn: () =>
      api
        .get(ApiPath.Billing.BASE, {
          params: {
            page,
            limit: 10,
            month: month ? Number(month) : undefined,
            year: year ? Number(year) : undefined,
            status: status || undefined,
            search: search || undefined,
            meterId: meterId || undefined,
            sortBy: sortBy || undefined,
            sortOrder: sortOrder ? sortOrder.toUpperCase() : undefined,
          },
        })
        .then((r) => r.data),
  })
}

export function useGetBill(id: string | undefined, enabled = true) {
  return useQuery<Payment>({
    queryKey: queryKeys.billing.detail(id ?? ""),
    queryFn: () => api.get(ApiPath.Billing.ONE(id!)).then((r) => r.data),
    enabled: enabled && !!id,
  })
}

export interface PayBillRequest {
  amount: number
  paymentMethod?: string
  reference?: string
  notes?: string
  discountIds?: string[]
  evidenceBase64?: string
}

export function usePayBill() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...payload }: { id: string } & PayBillRequest) =>
      api.post(ApiPath.Billing.PAY(id), payload).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.billing.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard })
      queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all })
    },
  })
}

export function useGenerateBill() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      consumptionId,
      discountIds,
    }: {
      consumptionId: string
      discountIds?: string[]
    }) =>
      api
        .post(ApiPath.Billing.GENERATE(consumptionId), {
          discountIds: discountIds && discountIds.length > 0 ? discountIds : undefined,
        })
        .then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.consumptions.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.billing.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard })
    },
  })
}

export async function downloadReceipt(paymentId: string) {
  const res = await api.get(ApiPath.Billing.RECEIPT(paymentId), {
    responseType: "blob",
  })
  const url = URL.createObjectURL(res.data)
  const a = document.createElement("a")
  a.href = url
  a.download = `receipt-${paymentId}.pdf`
  a.click()
  URL.revokeObjectURL(url)
}

export async function viewReceipt(paymentId: string) {
  const res = await api.get(ApiPath.Billing.RECEIPT_VIEW(paymentId), {
    responseType: "blob",
  })
  const url = URL.createObjectURL(res.data)
  window.open(url, "_blank")
  URL.revokeObjectURL(url)
}

export function useDiscounts() {
  return useQuery<Discount[]>({
    queryKey: queryKeys.billing.discounts,
    queryFn: () => api.get(ApiPath.Billing.DISCOUNTS).then((r) => r.data),
  })
}

export interface DiscountRequest {
  name: string
  type: DiscountType
  value: number
  description?: string
  is_active?: boolean
}

function invalidateDiscounts(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: queryKeys.billing.discounts })
  queryClient.invalidateQueries({ queryKey: queryKeys.billing.discountsActive })
}

export function useAddDiscount() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: DiscountRequest) =>
      api.post(ApiPath.Billing.DISCOUNTS, payload).then((r) => r.data),
    onSuccess: () => invalidateDiscounts(queryClient),
  })
}

export function useEditDiscount() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...payload }: { id: string } & Partial<DiscountRequest>) =>
      api.patch(ApiPath.Billing.DISCOUNT_ONE(id), payload).then((r) => r.data),
    onSuccess: () => invalidateDiscounts(queryClient),
  })
}

export function useDeleteDiscount() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      api.delete(ApiPath.Billing.DISCOUNT_ONE(id)).then((r) => r.data),
    onSuccess: () => invalidateDiscounts(queryClient),
  })
}
