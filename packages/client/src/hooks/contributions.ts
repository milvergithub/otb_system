import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { api } from "@/lib/api"
import { ApiPath } from "@/lib/apiPath"
import { queryKeys } from "@/lib/utils/query"
import type { SortOrder } from "@/components/ui/sortable-header"
import type {
  Contribution,
  ContributionObligation,
  ContributionObligationStatus,
  ContributionPayment,
  ContributionPaymentStatus,
  ContributionStatus,
  ContributionSummaryData,
  FinanceTransaction,
  Paginated,
} from "@/lib/types"

export interface SearchContributionsParams {
  page: number
  search?: string
  status?: ContributionStatus | ""
  sortBy?: string
  sortOrder?: SortOrder
}

export function useSearchContributions(params: SearchContributionsParams) {
  return useQuery<Paginated<Contribution>>({
    queryKey: queryKeys.contributions.list(
      params.page,
      params.search ?? "",
      params.status ?? "",
      params.sortBy ?? "",
      params.sortOrder ?? "",
    ),
    queryFn: () =>
      api
        .get(ApiPath.Contributions.BASE, {
          params: {
            page: params.page,
            limit: 10,
            search: params.search || undefined,
            status: params.status || undefined,
            sortBy: params.sortBy || undefined,
            sortOrder: params.sortOrder ? params.sortOrder.toUpperCase() : undefined,
          },
        })
        .then((r) => r.data),
  })
}

export function useGetContribution(id: string | undefined, enabled = true) {
  return useQuery<Contribution>({
    queryKey: queryKeys.contributions.detail(id ?? ""),
    queryFn: () => api.get(ApiPath.Contributions.ONE(id!)).then((r) => r.data),
    enabled: enabled && !!id,
  })
}

export function useContributionSummary(id: string | undefined, enabled = true) {
  return useQuery<ContributionSummaryData>({
    queryKey: queryKeys.contributions.summary(id ?? ""),
    queryFn: () =>
      api.get(ApiPath.Contributions.SUMMARY(id!)).then((r) => r.data),
    enabled: enabled && !!id,
  })
}

export interface SearchObligationsParams {
  page: number
  search?: string
  status?: ContributionObligationStatus | ""
}

export function useContributionObligations(
  id: string | undefined,
  params: SearchObligationsParams,
  enabled = true,
) {
  return useQuery<Paginated<ContributionObligation>>({
    queryKey: queryKeys.contributions.obligations(
      id ?? "",
      params.page,
      params.search ?? "",
      params.status ?? "",
    ),
    queryFn: () =>
      api
        .get(ApiPath.Contributions.OBLIGATIONS(id!), {
          params: {
            page: params.page,
            limit: 10,
            search: params.search || undefined,
            status: params.status || undefined,
          },
        })
        .then((r) => r.data),
    enabled: enabled && !!id,
  })
}

export function useContributionPayments(
  id: string | undefined,
  params: { page: number; status?: ContributionPaymentStatus | "" },
  enabled = true,
) {
  return useQuery<Paginated<ContributionPayment>>({
    queryKey: queryKeys.contributions.payments(
      id ?? "",
      params.page,
      params.status ?? "",
    ),
    queryFn: () =>
      api
        .get(ApiPath.Contributions.PAYMENTS(id!), {
          params: {
            page: params.page,
            limit: 10,
            status: params.status || undefined,
          },
        })
        .then((r) => r.data),
    enabled: enabled && !!id,
  })
}

export function useContributionFinances(
  id: string | undefined,
  page: number,
  enabled = true,
) {
  return useQuery<Paginated<FinanceTransaction>>({
    queryKey: queryKeys.contributions.finances(id ?? "", page),
    queryFn: () =>
      api
        .get(ApiPath.Contributions.FINANCES(id!), {
          params: { page, limit: 10 },
        })
        .then((r) => r.data),
    enabled: enabled && !!id,
  })
}

export interface ContributionDocumentsResponse {
  paymentEvidence: {
    paymentId: string
    fileKey: string
    url: string
    paidAt: string
    memberName: string | null
  }[]
  financeDocuments: {
    id: string
    file_key: string
    file_name: string
    mime_type: string
    kind: string
    created_at: string
  }[]
}

export function useContributionDocuments(
  id: string | undefined,
  enabled = true,
) {
  return useQuery<ContributionDocumentsResponse>({
    queryKey: queryKeys.contributions.documents(id ?? ""),
    queryFn: () =>
      api.get(ApiPath.Contributions.DOCUMENTS(id!)).then((r) => r.data),
    enabled: enabled && !!id,
  })
}

export interface ContributionRequest {
  title: string
  purpose?: string
  amountPerMember: number
  collectorUserId?: string
  responsibleUserId?: string
  notes?: string
}

export function useAddContribution() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: ContributionRequest) =>
      api.post(ApiPath.Contributions.BASE, payload).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.contributions.all })
    },
  })
}

export function useEditContribution() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...payload }: { id: string } & Partial<ContributionRequest>) =>
      api.patch(ApiPath.Contributions.ONE(id), payload).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.contributions.all })
    },
  })
}

export function useDeleteContribution() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      api.delete(ApiPath.Contributions.ONE(id)).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.contributions.all })
    },
  })
}

export function useChangeContributionStatus() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      action,
      reason,
    }: {
      id: string
      action: "activate" | "pause" | "complete" | "cancel"
      reason?: string
    }) => {
      const path =
        action === "activate"
          ? ApiPath.Contributions.ACTIVATE(id)
          : action === "pause"
            ? ApiPath.Contributions.PAUSE(id)
            : action === "complete"
              ? ApiPath.Contributions.COMPLETE(id)
              : ApiPath.Contributions.CANCEL(id)
      return api.post(path, reason ? { reason } : {}).then((r) => r.data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.contributions.all })
    },
  })
}

export function useAddContributionMembers() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      memberIds,
      allActive,
      excludeMemberIds,
    }: {
      id: string
      memberIds?: string[]
      allActive?: boolean
      excludeMemberIds?: string[]
    }) =>
      api
        .post(ApiPath.Contributions.MEMBERS(id), {
          memberIds,
          allActive,
          excludeMemberIds,
        })
        .then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.contributions.all })
    },
  })
}

export function useExonerateObligation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      obligationId,
      reason,
    }: {
      id: string
      obligationId: string
      reason: string
    }) =>
      api
        .post(ApiPath.Contributions.OBLIGATION_EXONERATE(id, obligationId), {
          reason,
        })
        .then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.contributions.all })
    },
  })
}

export function useCancelObligation() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      obligationId,
      reason,
    }: {
      id: string
      obligationId: string
      reason?: string
    }) =>
      api
        .post(ApiPath.Contributions.OBLIGATION_CANCEL(id, obligationId), {
          reason,
        })
        .then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.contributions.all })
    },
  })
}

export interface PayContributionRequest {
  obligationId: string
  amount: number
  paymentMethod?: string
  reference?: string
  notes?: string
  evidenceBase64?: string
  evidenceFileName?: string
  collectorUserId?: string
}

export function usePayContribution() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...payload }: { id: string } & PayContributionRequest) =>
      api.post(ApiPath.Contributions.PAYMENTS(id), payload).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.contributions.all })
      queryClient.invalidateQueries({ queryKey: ["finances"] })
    },
  })
}

export function useVoidContributionPayment() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      paymentId,
      reason,
    }: {
      id: string
      paymentId: string
      reason: string
    }) =>
      api
        .post(ApiPath.Contributions.PAYMENT_VOID(id, paymentId), { reason })
        .then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.contributions.all })
      queryClient.invalidateQueries({ queryKey: ["finances"] })
    },
  })
}

export async function downloadContributionRendition(id: string) {
  const res = await api.get(ApiPath.Contributions.RECEIPT(id), {
    responseType: "blob",
  })
  const url = URL.createObjectURL(res.data)
  const a = document.createElement("a")
  a.href = url
  a.download = `rendicion-${id}.pdf`
  a.click()
  URL.revokeObjectURL(url)
}

export async function downloadContributionPaymentReceipt(
  id: string,
  paymentId: string,
) {
  const res = await api.get(ApiPath.Contributions.PAYMENT_RECEIPT(id, paymentId), {
    responseType: "blob",
  })
  const url = URL.createObjectURL(res.data)
  const a = document.createElement("a")
  a.href = url
  a.download = `aporte-${paymentId}.pdf`
  a.click()
  URL.revokeObjectURL(url)
}
