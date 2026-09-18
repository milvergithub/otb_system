import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { api } from "@/lib/api"
import { ApiPath } from "@/lib/apiPath"
import type { Zone } from "@/lib/types"

export function useZones() {
  return useQuery<Zone[]>({
    queryKey: ["zones"],
    queryFn: async () => {
      const { data } = await api.get(ApiPath.Zones.BASE)
      return data
    },
  })
}

export function useCreateZone() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: {
      name: string
      type?: string
      geometry: Record<string, unknown>
      color?: string
    }) => {
      const { data } = await api.post(ApiPath.Zones.BASE, payload)
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["zones"] }),
  })
}

export function useUpdateZone() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({
      id,
      ...payload
    }: {
      id: string
      name?: string
      type?: string
      geometry?: Record<string, unknown>
      color?: string
    }) => {
      const { data } = await api.patch(ApiPath.Zones.ONE(id), payload)
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["zones"] }),
  })
}

export function useDeleteZone() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(ApiPath.Zones.ONE(id))
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["zones"] }),
  })
}
