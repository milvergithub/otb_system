import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { api } from "@/lib/api"
import { ApiPath } from "@/lib/apiPath"
import { queryKeys } from "@/lib/utils/query"
import type { AppNotification } from "@/lib/types"

export function useNotifications() {
  return useQuery<AppNotification[]>({
    queryKey: queryKeys.notifications.all,
    queryFn: () => api.get(ApiPath.Notifications.BASE).then((r) => r.data),
  })
}

export function useUnreadCount(refetchInterval?: number) {
  return useQuery<number>({
    queryKey: queryKeys.notifications.unreadCount,
    queryFn: () => api.get(ApiPath.Notifications.UNREAD_COUNT).then((r) => r.data),
    refetchInterval,
  })
}

function invalidateNotifications(queryClient: ReturnType<typeof useQueryClient>) {
  queryClient.invalidateQueries({ queryKey: queryKeys.notifications.all })
  queryClient.invalidateQueries({ queryKey: queryKeys.notifications.unreadCount })
}

export function useMarkNotificationRead() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.patch(ApiPath.Notifications.READ(id)).then((r) => r.data),
    onSuccess: () => invalidateNotifications(queryClient),
  })
}

export function useMarkAllRead() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => api.post(ApiPath.Notifications.MARK_ALL).then((r) => r.data),
    onSuccess: () => invalidateNotifications(queryClient),
  })
}
