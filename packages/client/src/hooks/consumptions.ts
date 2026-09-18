import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { api } from "@/lib/api"
import { ApiPath } from "@/lib/apiPath"
import { queryKeys } from "@/lib/utils/query"
import type { SortOrder } from "@/components/ui/sortable-header"
import type { Consumption, Paginated } from "@/lib/types"

export interface SearchConsumptionsParams {
  page: number
  month?: string
  year?: string
  meterId?: string
  search?: string
  sortBy?: string
  sortOrder?: SortOrder
}

export function useSearchConsumptions({
  page,
  month,
  year,
  meterId,
  search,
  sortBy,
  sortOrder,
}: SearchConsumptionsParams) {
  return useQuery<Paginated<Consumption>>({
    queryKey: queryKeys.consumptions.list(
      page,
      month ?? "",
      year ?? "",
      meterId ?? "",
      search ?? "",
      sortBy ?? "",
      sortOrder ?? "",
    ),
    queryFn: () =>
      api
        .get(ApiPath.Consumption.BASE, {
          params: {
            page,
            limit: 10,
            month: month ? Number(month) : undefined,
            year: year ? Number(year) : undefined,
            meterId: meterId || undefined,
            search: search || undefined,
            sortBy: sortBy || undefined,
            sortOrder: sortOrder ? sortOrder.toUpperCase() : undefined,
          },
        })
        .then((r) => r.data),
  })
}

export function useGetConsumption(id: string | undefined, enabled = true) {
  return useQuery<Consumption>({
    queryKey: queryKeys.consumptions.detail(id ?? ""),
    queryFn: () => api.get(ApiPath.Consumption.ONE(id!)).then((r) => r.data),
    enabled: enabled && !!id,
  })
}

export interface ConsumptionRequest {
  meterId: string
  month: number
  year: number
  currentReading: number
  imageBase64?: string
}

export function useAddConsumption() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: ConsumptionRequest) =>
      api.post(ApiPath.Consumption.BASE, payload).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.consumptions.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard })
    },
  })
}

export function useDeleteConsumption() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      api.delete(ApiPath.Consumption.ONE(id)).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.consumptions.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.billing.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard })
    },
  })
}
