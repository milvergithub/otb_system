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
  memberTypeId?: string
  sortBy?: string
  sortOrder?: SortOrder
  status?: "active" | "deleted" | "all"
}

export function useSearchMembers({ page, search, memberTypeId, sortBy, sortOrder, status = "active" }: SearchMembersParams) {
  return useQuery<Paginated<Member>>({
    queryKey: queryKeys.members.list(
      page,
      search ?? "",
      memberTypeId ?? "",
      sortBy ?? "",
      sortOrder ?? "",
      status,
    ),
    queryFn: () =>
      api
        .get(ApiPath.Members.BASE, {
          params: {
            page,
            limit: 10,
            search: search || undefined,
            memberTypeId: memberTypeId || undefined,
            sortBy: sortBy || undefined,
            sortOrder: sortOrder ? sortOrder.toUpperCase() : undefined,
            status: status === "active" ? undefined : status,
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
  memberTypeId?: string | null
}

export function useAddMember() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: MemberRequest) =>
      api.post(ApiPath.Members.BASE, payload).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.members.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard })
      queryClient.invalidateQueries({ queryKey: queryKeys.memberTypes.all })
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
      queryClient.invalidateQueries({ queryKey: queryKeys.memberTypes.all })
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

export function useRestoreMember() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      api.patch(ApiPath.Members.RESTORE(id)).then((r) => r.data as Member),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.members.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard })
      queryClient.invalidateQueries({ queryKey: queryKeys.memberTypes.all })
    },
  })
}

export function useImportMembersCsv() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      csvContent,
      sendWelcome,
    }: {
      csvContent: string
      sendWelcome: boolean
    }) =>
      api
        .post<{ created: number; errors: Array<{ row: number; message: string }> }>(
          "/members/import-csv",
          { csvContent, sendWelcome },
        )
        .then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.members.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard })
      queryClient.invalidateQueries({ queryKey: queryKeys.memberTypes.all })
    },
  })
}
