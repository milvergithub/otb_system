import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { api } from "@/lib/api"
import { ApiPath } from "@/lib/apiPath"
import { queryKeys } from "@/lib/utils/query"

export function useSettings() {
  return useQuery<Record<string, string>>({
    queryKey: queryKeys.settings.all,
    queryFn: () => api.get(ApiPath.Settings.BASE).then((r) => r.data),
  })
}

export function useUpdateSettings() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (values: Record<string, string>) =>
      api.patch(ApiPath.Settings.BASE, values).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.settings.all })
    },
  })
}
