import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { api } from "@/lib/api"
import { ApiPath } from "@/lib/apiPath"
import { queryKeys } from "@/lib/utils/query"
import type { CreateResponse, UserWithRoles } from "@/lib/types"

export function useSearchUsers(search?: string, enabled = true) {
  return useQuery<UserWithRoles[]>({
    queryKey: queryKeys.users.list(search ?? ""),
    queryFn: () =>
      api
        .get(ApiPath.Users.BASE, { params: { search: search || undefined } })
        .then((r) => r.data),
    enabled,
  })
}

/**
 * No password field: the server mints a temporary secret on create and on
 * regeneration, and never accepts a credential over this endpoint.
 */
export interface UserRequest {
  email: string
  fullName: string
  roleIds?: string[]
}

export function useAddUser() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: UserRequest) =>
      api.post<CreateResponse>(ApiPath.Users.BASE, payload).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.users.all })
    },
  })
}

export function useEditUser() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...payload }: { id: string } & Partial<UserRequest>) =>
      api.patch(ApiPath.Users.ONE(id), payload).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.users.all })
    },
  })
}

export function useDeleteUser() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete(ApiPath.Users.ONE(id)).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.users.all })
    },
  })
}

export function useToggleUserActive() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      api.patch(ApiPath.Users.TOGGLE_ACTIVE(id), { isActive }).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.users.all })
    },
  })
}

export function useRegeneratePassword() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      api
        .post<CreateResponse>(ApiPath.Users.REGENERATE_PASSWORD(id))
        .then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.users.all })
    },
  })
}
