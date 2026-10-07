import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { api } from "@/lib/api"
import { ApiPath } from "@/lib/apiPath"
import { queryKeys } from "@/lib/utils/query"
import type { SortOrder } from "@/components/ui/sortable-header"
import type { Meter, Paginated, WaterShare, SharePayment, MeterStatus } from "@/lib/types"

export interface SearchMetersParams {
  page: number
  search?: string
  status?: MeterStatus | ""
  type?: string
  sortBy?: string
  sortOrder?: SortOrder
  limit?: number
}

export function useSearchMeters({ page, search, status, type, sortBy, sortOrder, limit = 10 }: SearchMetersParams) {
  return useQuery<Paginated<Meter>>({
    queryKey: queryKeys.meters.list(
      page,
      search ?? "",
      status ?? "",
      type ?? "",
      sortBy ?? "",
      sortOrder ?? "",
    ),
    queryFn: () =>
      api
        .get(ApiPath.Meters.BASE, {
          params: {
            page,
            limit,
            search: search || undefined,
            status: status || undefined,
            type: type || undefined,
            sortBy: sortBy || undefined,
            sortOrder: sortOrder ? sortOrder.toUpperCase() : undefined,
          },
        })
        .then((r) => r.data),
  })
}

export function useGetMeter(id: string | undefined, enabled = true) {
  return useQuery<Meter>({
    queryKey: queryKeys.meters.detail(id ?? ""),
    queryFn: () => api.get(ApiPath.Meters.ONE(id!)).then((r) => r.data),
    enabled: enabled && !!id,
  })
}

export function useMeterMap() {
  return useQuery<Meter[]>({
    queryKey: queryKeys.meters.map,
    queryFn: () => api.get(ApiPath.Meters.MAP).then((r) => r.data),
  })
}

export function useMetersSelect() {
  return useQuery<Paginated<Meter>>({
    queryKey: queryKeys.meters.select,
    queryFn: () =>
      api.get(ApiPath.Meters.BASE, { params: { limit: 100 } }).then((r) => r.data),
  })
}

export function useMeterSharePayments(meterId: string | undefined, enabled = true) {
  return useQuery<SharePayment[]>({
    queryKey: queryKeys.sharePayments.byMeter(meterId ?? ""),
    queryFn: () => api.get(ApiPath.Meters.SHARE_PAYMENTS(meterId!)).then((r) => r.data),
    enabled: enabled && !!meterId,
  })
}

export function useAddSharePayment(meterId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: { amount: number; paymentMethod?: string; reference?: string; notes?: string; evidenceBase64?: string; collectorUserId?: string }) =>
      api.post(ApiPath.Meters.SHARE_PAYMENTS(meterId), payload).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.sharePayments.byMeter(meterId) })
      queryClient.invalidateQueries({ queryKey: queryKeys.meters.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard })
    },
  })
}

export function useAddMeter() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: {
      code: string
      memberId: string
      address: string
      type?: string
      latitude?: number
      longitude?: number
      shareAmount?: number
      sharePaymentMethod?: string
      shareReference?: string
      shareNotes?: string
      shareEvidenceBase64?: string
    }) => api.post(ApiPath.Meters.BASE, payload).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.meters.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard })
    },
  })
}

export function useEditMeter() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...payload }: { id: string; code: string; memberId: string; address: string; type?: string; latitude?: number; longitude?: number }) =>
      api.patch(ApiPath.Meters.ONE(id), payload).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.meters.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard })
    },
  })
}

export function useDeleteMeter() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete(ApiPath.Meters.ONE(id)).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.meters.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard })
    },
  })
}
