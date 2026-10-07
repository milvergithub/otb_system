import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { api } from "@/lib/api"
import { ApiPath } from "@/lib/apiPath"
import { queryKeys } from "@/lib/utils/query"
import type { SortOrder } from "@/components/ui/sortable-header"
import type {
  Activity,
  ActivityAttendanceSession,
  ActivityEvidence,
  ActivityStatus,
  ActivitySummary,
  ActivityType,
  FineType,
  FineTypeAppliesTo,
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
  status?: ActivityStatus | undefined
  typeId?: string | undefined
  responsibleUserId?: string | undefined
  dateFrom?: string | undefined
  dateTo?: string | undefined
}

export function useSearchActivities({
  page,
  search,
  sortBy,
  sortOrder,
  status,
  typeId,
  responsibleUserId,
  dateFrom,
  dateTo,
}: SearchActivitiesParams) {
  return useQuery<Paginated<Activity>>({
    queryKey: [
      ...queryKeys.activities.list(
        page,
        search ?? "",
        sortBy ?? "",
        sortOrder ?? "",
      ),
      status ?? "",
      typeId ?? "",
      responsibleUserId ?? "",
      dateFrom ?? "",
      dateTo ?? "",
    ],
    queryFn: () =>
      api
        .get(ApiPath.Activities.BASE, {
          params: {
            page,
            limit: 10,
            search: search || undefined,
            sortBy: sortBy || undefined,
            sortOrder: sortOrder ? sortOrder.toUpperCase() : undefined,
            status: status || undefined,
            typeId: typeId || undefined,
            responsibleUserId: responsibleUserId || undefined,
            dateFrom: dateFrom || undefined,
            dateTo: dateTo || undefined,
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
      status?: ActivityStatus
      typeId?: string
      location?: string
      responsibleUserId?: string
      collectorUserId?: string
      attendanceRequired?: boolean
      fineEnabled?: boolean
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
      status?: ActivityStatus
      typeId?: string
      location?: string
      responsibleUserId?: string
      collectorUserId?: string
      attendanceRequired?: boolean
      fineEnabled?: boolean
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
      appliesTo?: FineTypeAppliesTo
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
      code?: string
      name?: string
      description?: string
      amount?: number
      appliesTo?: FineTypeAppliesTo
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
    mutationFn: ({ id, notes, collectorUserId }: { id: string; notes?: string; collectorUserId?: string }) =>
      api.patch(ApiPath.Fines.PAY(id), { notes, collectorUserId }).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["activities"] })
    },
  })
}

export function usePayFinesBulk() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ ids, notes, collectorUserId }: { ids: string[]; notes?: string; collectorUserId?: string }) =>
      api.patch(ApiPath.Fines.BULK_PAY, { ids, notes, collectorUserId }).then((r) => r.data),
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

export type BulkAttendanceSession = "initial" | "final"
export type BulkAttendanceStatus = "present" | "absent" | "excused"

export interface BulkAttendancePayload {
  activityId: string
  session: BulkAttendanceSession
  attendance: {
    memberId: string
    status: BulkAttendanceStatus
  }[]
}

export function useSaveBulkAttendance() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ activityId, ...body }: BulkAttendancePayload) =>
      api
        .post<InitialControlResult | FinalControlResult>(
          ApiPath.Activities.ATTENDANCE_BULK(activityId),
          body,
        )
        .then((r) => r.data),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({
        queryKey: queryKeys.activities.attendance(vars.activityId),
      })
      qc.invalidateQueries({
        queryKey: queryKeys.activities.detail(vars.activityId),
      })
      qc.invalidateQueries({
        queryKey: ["activities", "summary", vars.activityId],
      })
      qc.invalidateQueries({
        queryKey: ["activities", "sessions", vars.activityId],
      })
      qc.invalidateQueries({ queryKey: queryKeys.activities.all })
    },
  })
}

// ── Activity Types ──────────────────────────────────

export function useActivityTypes() {
  return useQuery<ActivityType[]>({
    queryKey: ["activities", "types"],
    queryFn: () =>
      api.get(ApiPath.ActivityTypes.BASE).then((r) => r.data),
  })
}

export function useAddActivityType() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload: {
      code: string
      name: string
      description?: string
      isActive?: boolean
    }) =>
      api
        .post(ApiPath.ActivityTypes.BASE, payload)
        .then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["activities", "types"] })
    },
  })
}

export function useEditActivityType() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      ...payload
    }: {
      id: string
      name?: string
      description?: string
      isActive?: boolean
    }) =>
      api
        .patch(ApiPath.ActivityTypes.ONE(id), payload)
        .then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["activities", "types"] })
    },
  })
}

// ── Lifecycle & summary ─────────────────────────────

export function useChangeActivityStatus() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      status,
    }: {
      id: string
      status: ActivityStatus
    }) =>
      api.patch(ApiPath.Activities.STATUS(id), { status }).then((r) => r.data),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: queryKeys.activities.all })
      qc.invalidateQueries({
        queryKey: queryKeys.activities.detail(vars.id),
      })
    },
  })
}

export function useActivitySummary(id: string | undefined) {
  return useQuery<ActivitySummary>({
    queryKey: ["activities", "summary", id],
    queryFn: () =>
      api.get(ApiPath.Activities.SUMMARY(id!)).then((r) => r.data),
    enabled: !!id,
  })
}

export function useActivitySessions(id: string | undefined) {
  return useQuery<ActivityAttendanceSession[]>({
    queryKey: ["activities", "sessions", id],
    queryFn: () =>
      api
        .get(ApiPath.Activities.ATTENDANCE_SESSIONS(id!))
        .then((r) => r.data),
    enabled: !!id,
  })
}

// ── Evidence ────────────────────────────────────────

export function useActivityEvidence(id: string | undefined) {
  return useQuery<ActivityEvidence[]>({
    queryKey: ["activities", "evidence", id],
    queryFn: () =>
      api.get(ApiPath.Activities.EVIDENCE(id!)).then((r) => r.data),
    enabled: !!id,
  })
}

export interface UploadActivityEvidencePayload {
  activityId: string
  fileBase64: string
  fileName: string
  mimeType: string
  type: "photo" | "video" | "document"
  description?: string
}

export function useUploadActivityEvidence() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ activityId, ...body }: UploadActivityEvidencePayload) =>
      api
        .post(ApiPath.Activities.EVIDENCE(activityId), body)
        .then((r) => r.data),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({
        queryKey: ["activities", "evidence", vars.activityId],
      })
      qc.invalidateQueries({
        queryKey: queryKeys.activities.detail(vars.activityId),
      })
    },
  })
}

export function useDeleteActivityEvidence() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      activityId,
      evidenceId,
    }: {
      activityId: string
      evidenceId: string
    }) =>
      api
        .delete(ApiPath.Activities.EVIDENCE_ONE(activityId, evidenceId))
        .then((r) => r.data),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({
        queryKey: ["activities", "evidence", vars.activityId],
      })
    },
  })
}

// ── Manual fines ────────────────────────────────────

export function useCreateManualFine() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      activityId,
      ...body
    }: {
      activityId: string
      memberId: string
      fineTypeId: string
      notes?: string
    }) =>
      api
        .post(ApiPath.Activities.FINES(activityId), body)
        .then((r) => r.data),
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: queryKeys.activities.all })
      qc.invalidateQueries({
        queryKey: queryKeys.activities.detail(vars.activityId),
      })
      qc.invalidateQueries({
        queryKey: ["activities", "summary", vars.activityId],
      })
      qc.invalidateQueries({ queryKey: ["activities"] })
    },
  })
}

export const useActivityAttendance = useAttendance
