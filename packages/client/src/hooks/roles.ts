import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { api } from "@/lib/api"
import { ApiPath } from "@/lib/apiPath"
import { queryKeys } from "@/lib/utils/query"
import type { Permission, Role } from "@/lib/types"

export function useRoles() {
  return useQuery<Role[]>({
    queryKey: queryKeys.roles.all,
    queryFn: () => api.get(ApiPath.Roles.BASE).then((r) => r.data),
  })
}

export function usePermissions() {
  return useQuery<Permission[]>({
    queryKey: queryKeys.roles.permissions,
    queryFn: () => api.get(ApiPath.Roles.PERMISSIONS).then((r) => r.data),
  })
}

export interface RoleRequest {
  name: string
  description?: string
  permissionIds?: string[]
}

export function useAddRole() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: RoleRequest) =>
      api.post(ApiPath.Roles.BASE, payload).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.roles.all })
    },
  })
}

export function useEditRole() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...payload }: { id: string } & Partial<RoleRequest>) =>
      api.patch(ApiPath.Roles.ONE(id), payload).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.roles.all })
    },
  })
}

export function useDeleteRole() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete(ApiPath.Roles.ONE(id)).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.roles.all })
    },
  })
}

export function useAssignUserRoles() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ userId, roleIds }: { userId: string; roleIds: string[] }) =>
      api.put(ApiPath.Roles.ASSIGN_USER_ROLES(userId), { roleIds }).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.users.all })
    },
  })
}
