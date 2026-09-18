import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { api } from "@/lib/api"
import { ApiPath } from "@/lib/apiPath"
import { queryKeys } from "@/lib/utils/query"
import type { WaterShare } from "@/lib/types"

export function useActiveShares() {
  return useQuery<WaterShare[]>({
    queryKey: queryKeys.shares.active,
    queryFn: () => api.get(ApiPath.Shares.ACTIVE).then((r) => r.data),
  })
}

export function useSearchShares(includeInactive = true) {
  return useQuery<WaterShare[]>({
    queryKey: queryKeys.shares.list(includeInactive),
    queryFn: () =>
      api
        .get(ApiPath.Shares.BASE, {
          params: { includeInactive: String(includeInactive) },
        })
        .then((r) => r.data),
  })
}

export function useGetShare(id: string | undefined, enabled = true) {
  return useQuery<WaterShare>({
    queryKey: queryKeys.shares.detail(id ?? ""),
    queryFn: () => api.get(ApiPath.Shares.ONE(id!)).then((r) => r.data),
    enabled: enabled && !!id,
  })
}

export interface ShareRequest {
  name: string
  amount: number
  validFrom: string
  validUntil?: string
}

export function useAddShare() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: ShareRequest) =>
      api.post(ApiPath.Shares.BASE, payload).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.shares.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.shares.active })
      queryClient.invalidateQueries({ queryKey: queryKeys.meters.all })
    },
  })
}

export function useEditShare() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...payload }: { id: string } & Partial<ShareRequest>) =>
      api.patch(ApiPath.Shares.ONE(id), payload).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.shares.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.shares.active })
      queryClient.invalidateQueries({ queryKey: queryKeys.meters.all })
    },
  })
}

export function useDeleteShare() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete(ApiPath.Shares.ONE(id)).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.shares.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.shares.active })
      queryClient.invalidateQueries({ queryKey: queryKeys.meters.all })
    },
  })
}
