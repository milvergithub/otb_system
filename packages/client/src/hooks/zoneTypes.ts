import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { api } from "@/lib/api"
import { ApiPath } from "@/lib/apiPath"
import type { ZoneTypeItem } from "@/lib/types"

export function useZoneTypes() {
  return useQuery<ZoneTypeItem[]>({
    queryKey: ["zoneTypes"],
    queryFn: async () => {
      const { data } = await api.get(ApiPath.ZoneTypes.BASE)
      return data
    },
  })
}

export function useCreateZoneType() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (payload: {
      name: string
      default_color?: string
      default_line_width?: number
    }) => {
      const { data } = await api.post(ApiPath.ZoneTypes.BASE, payload)
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["zoneTypes"] }),
  })
}

export function useUpdateZoneType() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async ({
      id,
      ...payload
    }: {
      id: string
      name?: string
      default_color?: string
      default_line_width?: number
    }) => {
      const { data } = await api.patch(ApiPath.ZoneTypes.ONE(id), payload)
      return data
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["zoneTypes"] }),
  })
}

export function useDeleteZoneType() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(ApiPath.ZoneTypes.ONE(id))
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["zoneTypes"] }),
  })
}
