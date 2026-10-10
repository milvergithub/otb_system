import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { api } from "@/lib/api"
import { ApiPath } from "@/lib/apiPath"
import { queryKeys } from "@/lib/utils/query"
import type { MemberType } from "@/lib/types"

export interface MemberTypeRequest {
  code?: string
  name?: string
  description?: string | null
  isActive?: boolean
  sortOrder?: number
}

export function useMemberTypes(search = "", includeInactive = false) {
  return useQuery<MemberType[]>({
    queryKey: queryKeys.memberTypes.list(search, includeInactive),
    queryFn: () =>
      api
        .get(ApiPath.MemberTypes.BASE, {
          params: {
            search: search || undefined,
            includeInactive: includeInactive || undefined,
          },
        })
        .then((r) => r.data),
  })
}

export function useActiveMemberTypes() {
  return useQuery<MemberType[]>({
    queryKey: queryKeys.memberTypes.active,
    queryFn: () =>
      api.get(ApiPath.MemberTypes.BASE).then((r) => r.data),
  })
}

export function useCreateMemberType() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: MemberTypeRequest) =>
      api.post(ApiPath.MemberTypes.BASE, payload).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.memberTypes.all })
    },
  })
}

export function useEditMemberType() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...payload }: { id: string } & MemberTypeRequest) =>
      api.patch(ApiPath.MemberTypes.ONE(id), payload).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.memberTypes.all })
    },
  })
}

export function useSetMemberTypeStatus() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      api.patch(ApiPath.MemberTypes.STATUS(id), { isActive }).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.memberTypes.all })
    },
  })
}

export function useDeleteMemberType() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      api.delete(ApiPath.MemberTypes.ONE(id)).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.memberTypes.all })
    },
  })
}