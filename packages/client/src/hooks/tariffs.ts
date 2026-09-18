import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { api } from "@/lib/api"
import { ApiPath } from "@/lib/apiPath"
import { queryKeys } from "@/lib/utils/query"
import type { BaseTariff, Tariff } from "@/lib/types"

export function useSearchTariffs(includeInactive = true) {
  return useQuery<Tariff[]>({
    queryKey: queryKeys.tariffs.list(includeInactive),
    queryFn: () =>
      api
        .get(ApiPath.Tariffs.BASE, { params: { includeInactive: String(includeInactive) } })
        .then((r) => r.data),
  })
}

export function useGetTariff(id: string | undefined, enabled = true) {
  return useQuery<Tariff>({
    queryKey: queryKeys.tariffs.detail(id ?? ""),
    queryFn: () => api.get(ApiPath.Tariffs.ONE(id!)).then((r) => r.data),
    enabled: enabled && !!id,
  })
}

export interface TariffRequest {
  name: string
  minCubicMeters: number
  maxCubicMeters?: number
  pricePerCubicMeter: number
  validFrom: string
  validUntil?: string
}

export function useAddTariff() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: TariffRequest) =>
      api.post(ApiPath.Tariffs.BASE, payload).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tariffs.all })
    },
  })
}

export function useEditTariff() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...payload }: { id: string } & Partial<TariffRequest>) =>
      api.patch(ApiPath.Tariffs.ONE(id), payload).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tariffs.all })
    },
  })
}

export function useDeleteTariff() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete(ApiPath.Tariffs.ONE(id)).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tariffs.all })
    },
  })
}

export function useSearchBaseTariffs() {
  return useQuery<BaseTariff[]>({
    queryKey: queryKeys.baseTariffs.list,
    queryFn: () => api.get(ApiPath.Tariffs.BASE_TARIFFS).then((r) => r.data),
  })
}

export function useGetBaseTariff(id: string | undefined, enabled = true) {
  return useQuery<BaseTariff>({
    queryKey: queryKeys.baseTariffs.detail(id ?? ""),
    queryFn: () => api.get(ApiPath.Tariffs.BASE_TARIFFS_ONE(id!)).then((r) => r.data),
    enabled: enabled && !!id,
  })
}

export interface BaseTariffRequest {
  name: string
  amount: number
  validFrom: string
  validUntil?: string
  typeId?: string
}

export function useAddBaseTariff() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: BaseTariffRequest) =>
      api.post(ApiPath.Tariffs.BASE_TARIFFS, payload).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.baseTariffs.all })
    },
  })
}

export function useEditBaseTariff() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...payload }: { id: string } & Partial<BaseTariffRequest>) =>
      api.patch(ApiPath.Tariffs.BASE_TARIFFS_ONE(id), payload).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.baseTariffs.all })
    },
  })
}

export function useDeleteBaseTariff() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      api.delete(ApiPath.Tariffs.BASE_TARIFFS_ONE(id)).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.baseTariffs.all })
    },
  })
}

export interface CopyTariffsRequest {
  newValidFrom: string
  newValidUntil?: string
}

export function useCopyTariffs() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: CopyTariffsRequest) =>
      api.post(ApiPath.Tariffs.COPY, payload).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tariffs.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.baseTariffs.all })
    },
  })
}
