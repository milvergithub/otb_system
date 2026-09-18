import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { api } from "@/lib/api"
import { ApiPath } from "@/lib/apiPath"
import { queryKeys } from "@/lib/utils/query"
import type { SortOrder } from "@/components/ui/sortable-header"
import type { Member, Paginated } from "@/lib/types"

export function useMembersSelect() {
  return useQuery<Paginated<Member>>({
    queryKey: queryKeys.members.select,
    queryFn: () =>
      api.get(ApiPath.Members.BASE, { params: { limit: 100 } }).then((r) => r.data),
  })
}

export function useAllMembers() {
  return useQuery<Pick<Member, 'id' | 'ci' | 'first_name' | 'last_name'>[]>({
    queryKey: ["members", "all"],
    queryFn: () =>
      api.get(ApiPath.Members.ALL).then((r) => r.data),
  })
}

export interface SearchMembersParams {
  page: number
  search?: string
  sortBy?: string
  sortOrder?: SortOrder
}

export function useSearchMembers({ page, search, sortBy, sortOrder }: SearchMembersParams) {
  return useQuery<Paginated<Member>>({
    queryKey: queryKeys.members.list(
      page,
      search ?? "",
      sortBy ?? "",
      sortOrder ?? "",
    ),
    queryFn: () =>
      api
        .get(ApiPath.Members.BASE, {
          params: {
            page,
            limit: 10,
            search: search || undefined,
            sortBy: sortBy || undefined,
            sortOrder: sortOrder ? sortOrder.toUpperCase() : undefined,
          },
        })
        .then((r) => r.data),
  })
}

export function useGetMember(id: string | undefined, enabled = true) {
  return useQuery<Member>({
    queryKey: queryKeys.members.detail(id ?? ""),
    queryFn: () => api.get(ApiPath.Members.ONE(id!)).then((r) => r.data),
    enabled: enabled && !!id,
  })
}

export interface MemberRequest {
  ci: string
  firstName: string
  lastName: string
  phone?: string
  phoneCountry?: string
  address?: string
}

export function useAddMember() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: MemberRequest) =>
      api.post(ApiPath.Members.BASE, payload).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.members.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard })
    },
  })
}

export function useEditMember() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...payload }: { id: string } & Partial<MemberRequest>) =>
      api.patch(ApiPath.Members.ONE(id), payload).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.members.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard })
    },
  })
}

export function useDeleteMember() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete(ApiPath.Members.ONE(id)).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.members.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard })
    },
  })
}
