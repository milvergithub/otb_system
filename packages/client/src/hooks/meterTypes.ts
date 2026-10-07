import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { api } from "@/lib/api"
import { ApiPath } from "@/lib/apiPath"
import { queryKeys } from "@/lib/utils/query"
import type { MeterTypeItem } from "@/lib/types"

export function useMeterTypes() {
  return useQuery<MeterTypeItem[]>({
    queryKey: queryKeys.meterTypes.all,
    queryFn: () => api.get(ApiPath.MeterTypes.BASE).then((r) => r.data),
  })
}

export function useCreateMeterType() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: { code: string; name: string }) =>
      api.post(ApiPath.MeterTypes.BASE, payload).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.meterTypes.all })
    },
  })
}

export function useUpdateMeterType() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) =>
      api.patch(ApiPath.MeterTypes.ONE(id), { name }).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.meterTypes.all })
    },
  })
}

export function useDeleteMeterType() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      api.delete(ApiPath.MeterTypes.ONE(id)).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.meterTypes.all })
    },
  })
}
