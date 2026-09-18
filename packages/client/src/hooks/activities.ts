import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { api } from "@/lib/api"
import { ApiPath } from "@/lib/apiPath"
import { queryKeys } from "@/lib/utils/query"
import type { SortOrder } from "@/components/ui/sortable-header"
import type {
  Activity,
  ActivityShare,
  FineType,
  Fine,
  FineStats,
  Paginated,
  Attendance,
  AttendanceSummary,
  InitialControlResult,
  FinalControlResult,
} from "@/lib/types"

// ── Activities ───────────────────────────────────────

export function useActivities() {
  return useQuery<Activity[]>({
    queryKey: queryKeys.activities.all,
    queryFn: () =>
      api.get(ApiPath.Activities.ALL).then((r) => r.data),
  })
}

export interface SearchActivitiesParams {
  page: number
  search?: string
  sortBy?: string
  sortOrder?: SortOrder
}

export function useSearchActivities({
  page,
  search,
  sortBy,
  sortOrder,
}: SearchActivitiesParams) {
  return useQuery<Paginated<Activity>>({
    queryKey: queryKeys.activities.list(
      page,
      search ?? "",
      sortBy ?? "",
      sortOrder ?? "",
    ),
    queryFn: () =>
      api
        .get(ApiPath.Activities.BASE, {
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

export function useGetActivity(id: string | undefined) {
  return useQuery<Activity>({
    queryKey: queryKeys.activities.detail(id!),
    queryFn: () =>
      api.get(ApiPath.Activities.ONE(id!)).then((r) => r.data),
    enabled: !!id,
  })
}

export function useAddActivity() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: {
      name: string
      description?: string
      date: string
      startTime: string
      endTime: string
    }) =>
      api.post(ApiPath.Activities.BASE, payload).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.activities.all })
    },
  })
}

export function useEditActivity() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      ...payload
    }: {
      id: string
      name?: string
      description?: string
      date?: string
      startTime?: string
      endTime?: string
    }) =>
      api
        .patch(ApiPath.Activities.ONE(id), payload)
        .then((r) => r.data),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: queryKeys.activities.all })
      qc.invalidateQueries({
        queryKey: queryKeys.activities.detail(vars.id),
      })
    },
  })
}

export function useDeleteActivity() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id }: { id: string; secretariaId?: string }) =>
      api.delete(ApiPath.Activities.ONE(id)).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: queryKeys.activities.all })
    },
  })
}

// ── Activity Shares ─────────────────────────────────

export function useActivityShares(activityId: string | undefined) {
  return useQuery<ActivityShare[]>({
    queryKey: ["activities", "shares", activityId],
    queryFn: () =>
      api.get(ApiPath.Activities.SHARES(activityId!)).then((r) => r.data),
    enabled: !!activityId,
  })
}

export function useShareActivity() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      activityId,
      userId,
      permission,
    }: {
      activityId: string
      userId: string
      permission?: string
    }) =>
      api
        .post(ApiPath.Activities.SHARES(activityId), { userId, permission })
        .then((r) => r.data),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: queryKeys.activities.all })
      qc.invalidateQueries({
        queryKey: ["activities", "shares", vars.activityId],
      })
    },
  })
}

export function useUnshareActivity() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      activityId,
      userId,
    }: {
      activityId: string
      userId: string
    }) =>
      api
        .delete(ApiPath.Activities.SHARE_ONE(activityId, userId))
        .then((r) => r.data),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: queryKeys.activities.all })
      qc.invalidateQueries({
        queryKey: ["activities", "shares", vars.activityId],
      })
    },
  })
}

// ── Fine Types ──────────────────────────────────────

export function useFineTypes() {
  return useQuery<FineType[]>({
    queryKey: ["activities", "fine-types"],
    queryFn: () =>
      api.get(ApiPath.FineTypes.BASE).then((r) => r.data),
  })
}

export function useAddFineType() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: {
      code: string
      name: string
      description?: string
      amount: number
      isActive?: boolean
    }) =>
      api
        .post(ApiPath.FineTypes.BASE, payload)
        .then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["activities", "fine-types"] })
    },
  })
}

export function useEditFineType() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      ...payload
    }: {
      id: string
      name?: string
      description?: string
      amount?: number
      isActive?: boolean
    }) =>
      api
        .patch(ApiPath.FineTypes.ONE(id), payload)
        .then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["activities", "fine-types"] })
    },
  })
}

export function useDeleteFineType() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id }: { id: string }) =>
      api.delete(ApiPath.FineTypes.ONE(id)).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["activities", "fine-types"] })
    },
  })
}

// ── Attendance ──────────────────────────────────────

export function useAttendance(activityId: string | undefined) {
  return useQuery<Attendance[]>({
    queryKey: queryKeys.activities.attendance(activityId!),
    queryFn: () =>
      api
        .get(ApiPath.Activities.ATTENDANCE(activityId!))
        .then((r) => r.data),
    enabled: !!activityId,
  })
}

export function useSaveInitialControl() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      activityId,
      memberIds,
    }: {
      activityId: string
      memberIds: string[]
    }) =>
      api
        .post<InitialControlResult>(
          ApiPath.Activities.INITIAL_CONTROL(activityId),
          { memberIds },
        )
        .then((r) => r.data),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({
        queryKey: queryKeys.activities.attendance(vars.activityId),
      })
      qc.invalidateQueries({
        queryKey: queryKeys.activities.detail(vars.activityId),
      })
      qc.invalidateQueries({ queryKey: queryKeys.activities.all })
    },
  })
}

export function useSaveFinalControl() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      activityId,
      memberIds,
    }: {
      activityId: string
      memberIds: string[]
    }) =>
      api
        .post<FinalControlResult>(
          ApiPath.Activities.FINAL_CONTROL(activityId),
          { memberIds },
        )
        .then((r) => r.data),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({
        queryKey: queryKeys.activities.attendance(vars.activityId),
      })
      qc.invalidateQueries({
        queryKey: queryKeys.activities.detail(vars.activityId),
      })
      qc.invalidateQueries({ queryKey: queryKeys.activities.all })
      qc.invalidateQueries({ queryKey: ["activities"] })
    },
  })
}

// ── All Attendance (global) ─────────────────────────

export function useAllAttendance(filters?: {
  memberId?: string
  activityId?: string
  status?: string
}) {
  return useQuery<Attendance[]>({
    queryKey: ["activities", "all-attendance", filters],
    queryFn: () =>
      api
        .get(ApiPath.Attendance.ALL, { params: filters })
        .then((r) => r.data),
  })
}

export function useMemberAttendanceSummary(
  memberId: string | undefined,
  activityId: string | undefined,
) {
  return useQuery<AttendanceSummary>({
    queryKey: queryKeys.activities.memberAttendance(memberId!),
    queryFn: () =>
      api
        .get(
          ApiPath.Attendance.MEMBER_SUMMARY(memberId!, activityId!),
        )
        .then((r) => r.data),
    enabled: !!memberId && !!activityId,
  })
}

// ── Fines ───────────────────────────────────────────

export function useFines(filters?: {
  memberId?: string
  status?: string
}) {
  return useQuery<Fine[]>({
    queryKey: queryKeys.activities.fines(
      filters?.memberId,
      filters?.status,
    ),
    queryFn: () =>
      api
        .get(ApiPath.Fines.BASE, { params: filters })
        .then((r) => r.data),
  })
}

export function useFinesStats(filters?: { memberId?: string }) {
  return useQuery<FineStats>({
    queryKey: queryKeys.activities.finesStats(
      filters?.memberId,
    ),
    queryFn: () =>
      api
        .get(ApiPath.Fines.STATS, { params: filters })
        .then((r) => r.data),
  })
}

export interface FinesReportParams {
  page: number
  status?: string
  search?: string
  activityId?: string
  sortBy?: string
  sortOrder?: SortOrder
}

export function useFinesReport({ page, status, search, activityId, sortBy, sortOrder }: FinesReportParams) {
  return useQuery<Paginated<Fine>>({
    queryKey: queryKeys.activities.finesReport(
      page,
      status ?? "",
      search ?? "",
      activityId ?? "",
      sortBy ?? "",
      sortOrder ?? "",
    ),
    queryFn: () =>
      api
        .get(ApiPath.Fines.REPORT, {
          params: {
            page,
            limit: 10,
            status: status || undefined,
            search: search || undefined,
            activityId: activityId || undefined,
            sortBy: sortBy || undefined,
            sortOrder: sortOrder ? sortOrder.toUpperCase() : undefined,
          },
        })
        .then((r) => r.data),
  })
}

export function useMemberFines(memberId: string | undefined) {
  return useQuery<Fine[]>({
    queryKey: ["activities", "member-fines", memberId],
    queryFn: () =>
      api
        .get(ApiPath.Fines.MEMBER(memberId!))
        .then((r) => r.data),
    enabled: !!memberId,
  })
}

export function usePayFine() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, notes }: { id: string; notes?: string }) =>
      api.patch(ApiPath.Fines.PAY(id), { notes }).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["activities"] })
    },
  })
}

export function usePayFinesBulk() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ ids, notes }: { ids: string[]; notes?: string }) =>
      api.patch(ApiPath.Fines.BULK_PAY, { ids, notes }).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["activities"] })
    },
  })
}

export function useCancelFine() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      reason,
    }: {
      id: string
      reason?: string
    }) =>
      api
        .patch(ApiPath.Fines.CANCEL(id), { reason })
        .then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["activities"] })
    },
  })
}

export const useActivityAttendance = useAttendance
