import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { api } from "@/lib/api"
import { ApiPath } from "@/lib/apiPath"
import { queryKeys } from "@/lib/utils/query"
import type { AppNotification, Paginated } from "@/lib/types"

export interface SearchNotificationsParams {
  page?: number
  search?: string
  memberId?: string
  isRead?: boolean
  type?: AppNotification["type"]
  sortBy?: string
  sortOrder?: "ASC" | "DESC"
}

export function useNotifications() {
  return useQuery<AppNotification[]>({
    queryKey: queryKeys.notifications.all,
    queryFn: () => api.get(ApiPath.Notifications.BASE).then((r) => r.data),
  })
}

export function useSearchNotifications(params: SearchNotificationsParams = {}) {
  const page = params.page ?? 1
  return useQuery<Paginated<AppNotification>>({
    queryKey: [
      "notifications",
      "search",
      page,
      params.search ?? "",
      params.memberId ?? "",
      params.isRead ?? "",
      params.type ?? "",
      params.sortBy ?? "",
      params.sortOrder ?? "",
    ],
    queryFn: () =>
      api
        .get(ApiPath.Notifications.BASE, {
          params: {
            page,
            limit: 10,
            search: params.search || undefined,
            memberId: params.memberId || undefined,
            isRead: params.isRead,
            type: params.type || undefined,
            sortBy: params.sortBy || undefined,
            sortOrder: params.sortOrder || undefined,
          },
        })
        .then((r) => r.data),
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