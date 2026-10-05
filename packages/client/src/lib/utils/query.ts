import type { QueryKey, UseQueryOptions } from "@tanstack/react-query"

export function retryQuery<TData, TError = Error>(
  options: UseQueryOptions<TData, TError> & { retry?: number; retryDelay?: number },
): UseQueryOptions<TData, TError> {
  return {
    retry: options.retry ?? 2,
    retryDelay: options.retryDelay ?? 1000,
    ...options,
  }
}

export const queryKeys = {
  meters: {
    all: ["meters"] as const,
    list: (
      page: number,
      search: string,
      status: string,
      type: string,
      sortBy: string,
      sortOrder: string,
    ) => ["meters", page, search, status, type, sortBy, sortOrder] as const,
    detail: (id: string) => ["meters", "detail", id] as const,
    map: ["meters", "map"] as const,
    select: ["meters", "select"] as const,
  },
  assets: {
    all: ["assets"] as const,
    list: (
      page: number,
      search: string,
      categoryId: string,
      locationId: string,
      status: string,
      condition: string,
      acquisitionType: string,
      responsibleUserId: string,
      responsibleMemberId: string,
      sortBy: string,
      sortOrder: string,
    ) =>
      [
        "assets",
        page,
        search,
        categoryId,
        locationId,
        status,
        condition,
        acquisitionType,
        responsibleUserId,
        responsibleMemberId,
        sortBy,
        sortOrder,
      ] as const,
    detail: (id: string) => ["assets", "detail", id] as const,
    select: ["assets", "select"] as const,
    statusSummary: ["assets", "status-summary"] as const,
    categories: ["assets", "categories"] as const,
    locations: ["assets", "locations"] as const,
  },
  finances: {
    all: ["finances"] as const,
    list: (
      page: number,
      type: string,
      search: string,
      categoryId: string,
      memberId: string,
      userId: string,
      assetId: string,
      sourceType: string,
      dateFrom: string,
      dateTo: string,
      sortBy: string,
      sortOrder: string,
    ) => ["finances", page, type, search, categoryId, memberId, userId, assetId, sourceType, dateFrom, dateTo, sortBy, sortOrder] as const,
    detail: (id: string) => ["finances", "detail", id] as const,
    categories: ["finances", "categories"] as const,
    reportsSummary: (startDate: string, endDate: string) => ["finances", "reports", "summary", startDate, endDate] as const,
    reportsByCategory: (startDate: string, endDate: string, type: string) => ["finances", "reports", "by-category", startDate, endDate, type] as const,
    reportsByMethod: (startDate: string, endDate: string) => ["finances", "reports", "by-method", startDate, endDate] as const,
    reportsMonthly: (startDate: string, endDate: string) => ["finances", "reports", "monthly", startDate, endDate] as const,
    reportsWater: (startDate: string, endDate: string) => ["finances", "reports", "water", startDate, endDate] as const,
  },
  members: {
    all: ["members"] as const,
    list: (page: number, search: string, sortBy: string, sortOrder: string) =>
      ["members", page, search, sortBy, sortOrder] as const,
    detail: (id: string) => ["members", "detail", id] as const,
    select: ["members", "select"] as const,
  },
  shares: {
    all: ["shares"] as const,
    list: (includeInactive: boolean) => ["shares", "list", includeInactive] as const,
    detail: (id: string) => ["shares", "detail", id] as const,
    active: ["shares", "active"] as const,
  },
  sharePayments: {
    byMeter: (meterId: string) => ["share-payments", meterId] as const,
  },
  meterTypes: {
    all: ["meter-types"] as const,
  },
  consumptions: {
    all: ["consumptions"] as const,
    list: (
      page: number,
      month: string,
      year: string,
      meterId: string,
      search: string,
      sortBy: string,
      sortOrder: string,
    ) => ["consumptions", page, month, year, meterId, search, sortBy, sortOrder] as const,
    detail: (id: string) => ["consumptions", "detail", id] as const,
  },
  billing: {
    all: ["billing"] as const,
    list: (
      page: number,
      month: string,
      year: string,
      status: string,
      search: string,
      meterId: string,
      sortBy: string,
      sortOrder: string,
    ) => ["billing", page, month, year, status, search, meterId, sortBy, sortOrder] as const,
    detail: (id: string) => ["billing", "detail", id] as const,
    discounts: ["billing", "discounts"] as const,
    discountsActive: ["billing", "discounts", "active"] as const,
  },
  notifications: {
    all: ["notifications"] as const,
    unreadCount: ["notifications", "unread-count"] as const,
  },
  settings: {
    all: ["settings"] as const,
  },
  roles: {
    all: ["roles"] as const,
    permissions: ["roles", "permissions"] as const,
  },
  users: {
    all: ["users"] as const,
    list: (search: string) => ["users", search] as const,
  },
  tariffs: {
    all: ["tariffs"] as const,
    list: (includeInactive: boolean) => ["tariffs", "list", includeInactive] as const,
    detail: (id: string) => ["tariffs", "detail", id] as const,
  },
  baseTariffs: {
    all: ["base-tariffs"] as const,
    list: ["base-tariffs", "list"] as const,
    detail: (id: string) => ["base-tariffs", "detail", id] as const,
  },
  dashboard: ["dashboard"] as const,
   reports: {
    revenue: (startDate: string, endDate: string) =>
      ["reports", "revenue", startDate, endDate] as const,
    overdue: ["reports", "overdue"] as const,
  },
  audit: {
    all: ["audit"] as const,
    list: (
      page: number,
      search: string,
      entity: string,
      action: string,
      userId: string,
      sortBy: string,
      sortOrder: string,
    ) =>
      [
        "audit",
        page,
        search,
        entity,
        action,
        userId,
        sortBy,
        sortOrder,
      ] as const,
  },
  activities: {
    all: ["activities"] as const,
    list: (
      page: number,
      search: string,
      sortBy: string,
      sortOrder: string,
    ) => ["activities", "list", page, search, sortBy, sortOrder] as const,
    detail: (id: string) => ["activities", "detail", id] as const,
    activities: () => ["activities", "activities"] as const,
    activityDetail: (id: string) =>
      ["activities", "activity", id] as const,
    attendance: (activityId: string) =>
      ["activities", "attendance", activityId] as const,
    fines: (memberId?: string, status?: string) =>
      ["activities", "fines", memberId, status] as const,
    fineDetail: (id: string) => ["activities", "fine", id] as const,
    finesStats: (memberId?: string) =>
      ["activities", "fines-stats", memberId] as const,
    finesReport: (
      page: number,
      status: string,
      search: string,
      activityId: string,
      sortBy: string,
      sortOrder: string,
    ) =>
      [
        "activities",
        "fines-report",
        page,
        status,
        search,
        activityId,
        sortBy,
        sortOrder,
      ] as const,
    memberAttendance: (memberId: string) =>
      ["activities", "member-attendance", memberId] as const,
  },
  // @deprecated - aliases para compatibilidad temporal (remover tras migración)
  atividades: {
    all: ["activities"] as const,
    detail: (id: string) => ["activities", "detail", id] as const,
    activities: () => ["activities", "activities"] as const,
    activityDetail: (id: string) =>
      ["activities", "activity", id] as const,
    attendance: (activityId: string) =>
      ["activities", "attendance", activityId] as const,
    fines: (memberId?: string, status?: string) =>
      ["activities", "fines", memberId, status] as const,
    fineDetail: (id: string) => ["activities", "fine", id] as const,
    finesStats: (memberId?: string) =>
      ["activities", "fines-stats", memberId] as const,
    memberAttendance: (memberId: string) =>
      ["activities", "member-attendance", memberId] as const,
  },
  secretarias: {
    all: ["activities"] as const,
    detail: (id: string) => ["activities", "detail", id] as const,
    activities: () => ["activities", "activities"] as const,
    activityDetail: (id: string) =>
      ["activities", "activity", id] as const,
    attendance: (activityId: string) =>
      ["activities", "attendance", activityId] as const,
    fines: (memberId?: string, status?: string) =>
      ["activities", "fines", memberId, status] as const,
    fineDetail: (id: string) => ["activities", "fine", id] as const,
    finesStats: (memberId?: string) =>
      ["activities", "fines-stats", memberId] as const,
    memberAttendance: (memberId: string) =>
      ["activities", "member-attendance", memberId] as const,
  },
} as const
