import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { api } from "@/lib/api"
import { ApiPath } from "@/lib/apiPath"
import { queryKeys } from "@/lib/utils/query"
import type { SortOrder } from "@/components/ui/sortable-header"
import type {
  Asset,
  AssetCategory,
  AssetDocument,
  AssetLocation,
  AssetMaintenance,
  AssetMovement,
  AssetStatus,
  Paginated,
} from "@/lib/types"

export interface SearchAssetsParams {
  page: number
  search?: string
  categoryId?: string
  locationId?: string
  status?: AssetStatus | ""
  condition?: string
  acquisitionType?: string
  responsibleUserId?: string
  responsibleMemberId?: string
  sortBy?: string
  sortOrder?: SortOrder
}

export function useSearchAssets(params: SearchAssetsParams) {
  return useQuery<Paginated<Asset>>({
    queryKey: queryKeys.assets.list(
      params.page,
      params.search ?? "",
      params.categoryId ?? "",
      params.locationId ?? "",
      params.status ?? "",
      params.condition ?? "",
      params.acquisitionType ?? "",
      params.responsibleUserId ?? "",
      params.responsibleMemberId ?? "",
      params.sortBy ?? "",
      params.sortOrder ?? "",
    ),
    queryFn: () =>
      api
        .get(ApiPath.Assets.BASE, {
          params: {
            page: params.page,
            limit: 10,
            search: params.search || undefined,
            categoryId: params.categoryId || undefined,
            locationId: params.locationId || undefined,
            status: params.status || undefined,
            condition: params.condition || undefined,
            acquisitionType: params.acquisitionType || undefined,
            responsibleUserId: params.responsibleUserId || undefined,
            responsibleMemberId: params.responsibleMemberId || undefined,
            sortBy: params.sortBy || undefined,
            sortOrder: params.sortOrder ? params.sortOrder.toUpperCase() : undefined,
          },
        })
        .then((r) => r.data),
  })
}

export function useGetAsset(id: string | undefined, enabled = true) {
  return useQuery<Asset>({
    queryKey: queryKeys.assets.detail(id ?? ""),
    queryFn: () => api.get(ApiPath.Assets.ONE(id!)).then((r) => r.data),
    enabled: enabled && !!id,
  })
}

export function useAssetsSelect() {
  return useQuery<Pick<Asset, "id" | "code" | "name" | "status">[]>({
    queryKey: queryKeys.assets.select,
    queryFn: () => api.get(ApiPath.Assets.SELECT).then((r) => r.data),
  })
}

export function useAssetStatusSummary() {
  return useQuery<Record<AssetStatus, number>>({
    queryKey: queryKeys.assets.statusSummary,
    queryFn: () => api.get(ApiPath.Assets.STATUS_SUMMARY).then((r) => r.data),
  })
}

export function useAssetCategories() {
  return useQuery<AssetCategory[]>({
    queryKey: queryKeys.assets.categories,
    queryFn: () => api.get(ApiPath.AssetCategories.BASE).then((r) => r.data),
  })
}

export function useAssetLocations() {
  return useQuery<AssetLocation[]>({
    queryKey: queryKeys.assets.locations,
    queryFn: () => api.get(ApiPath.AssetLocations.BASE).then((r) => r.data),
  })
}

export function useAssetMovements(id: string | undefined, enabled = true) {
  return useQuery<AssetMovement[]>({
    queryKey: queryKeys.assets.detail((id ?? "") + "/movements"),
    queryFn: () => api.get(ApiPath.Assets.MOVEMENTS(id!)).then((r) => r.data),
    enabled: enabled && !!id,
  })
}

export function useAssetMaintenances(id: string | undefined, enabled = true) {
  return useQuery<AssetMaintenance[]>({
    queryKey: queryKeys.assets.detail((id ?? "") + "/maintenances"),
    queryFn: () => api.get(ApiPath.Assets.MAINTENANCES(id!)).then((r) => r.data),
    enabled: enabled && !!id,
  })
}

export function useAssetDocuments(id: string | undefined, enabled = true) {
  return useQuery<AssetDocument[]>({
    queryKey: queryKeys.assets.detail((id ?? "") + "/documents"),
    queryFn: () => api.get(ApiPath.Assets.DOCUMENTS(id!)).then((r) => r.data),
    enabled: enabled && !!id,
  })
}

export interface AssetRequest {
  name: string
  description?: string
  categoryId?: string
  locationId?: string
  condition?: string
  quantity?: number
  acquisitionDate?: string
  acquisitionValue?: number
  acquisitionType?: string
  currentResponsibleUserId?: string
  currentResponsibleMemberId?: string
  notes?: string
}

export function useAddAsset() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: AssetRequest) =>
      api.post(ApiPath.Assets.BASE, payload).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.assets.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard })
    },
  })
}

export function useAddAssetsBulk() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: AssetRequest & { count: number }) =>
      api.post(ApiPath.Assets.BULK, payload).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.assets.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard })
    },
  })
}

export function useEditAsset() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...payload }: { id: string } & Partial<AssetRequest>) =>
      api.patch(ApiPath.Assets.ONE(id), payload).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.assets.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard })
    },
  })
}

export function useDeleteAsset() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete(ApiPath.Assets.ONE(id)).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.assets.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard })
    },
  })
}

export function useLoanAsset() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: {
      id: string
      toLocationId?: string
      responsibleUserId?: string
      responsibleMemberId?: string
      motive: string
      movedAt?: string
      notes?: string
    }) => {
      const { id, ...body } = payload
      return api.post(ApiPath.Assets.LOAN(id), body).then((r) => r.data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.assets.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard })
    },
  })
}

export function useReturnAsset() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: { id: string; returnLocationId?: string; returnedAt?: string; notes?: string }) => {
      const { id, ...body } = payload
      return api.post(ApiPath.Assets.RETURN(id), body).then((r) => r.data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.assets.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard })
    },
  })
}

export function useTransferAsset() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: { id: string; toLocationId: string; motive?: string; movedAt?: string; notes?: string }) => {
      const { id, ...body } = payload
      return api.post(ApiPath.Assets.TRANSFER(id), body).then((r) => r.data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.assets.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard })
    },
  })
}

export function useReportLostAsset() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: { id: string; reason?: string }) => {
      const { id, ...body } = payload
      return api.post(ApiPath.Assets.LOST(id), body).then((r) => r.data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.assets.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard })
    },
  })
}

export function useRetireAsset() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: {
      id: string
      retiredAt: string
      reason: string
      responsibleUserId?: string
      notes?: string
    }) => {
      const { id, ...body } = payload
      return api.post(ApiPath.Assets.RETIRE(id), body).then((r) => r.data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.assets.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard })
    },
  })
}

export function useRestoreAsset() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: { id: string; notes?: string }) => {
      const { id, ...body } = payload
      return api.post(ApiPath.Assets.RESTORE(id), body).then((r) => r.data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.assets.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard })
    },
  })
}

export function useAddMaintenance() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: {
      id: string
      reason: string
      startedAt?: string
      cost?: number
      provider?: string
      notes?: string
    }) => {
      const { id, ...body } = payload
      return api.post(ApiPath.Assets.START_MAINTENANCE(id), body).then((r) => r.data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.assets.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard })
    },
  })
}

export function useFinishMaintenance() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: {
      id: string
      maintenanceId: string
      finishedAt?: string
      condition?: string
      cost?: number
      provider?: string
      notes?: string
    }) => {
      const { id, maintenanceId, ...body } = payload
      return api.post(ApiPath.Assets.FINISH_MAINTENANCE(id, maintenanceId), body).then((r) => r.data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.assets.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.dashboard })
    },
  })
}

export function useAddAssetDocument() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: { id: string; fileBase64: string; fileName?: string; kind?: string }) => {
      const { id, ...body } = payload
      return api.post(ApiPath.Assets.DOCUMENTS(id), body).then((r) => r.data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.assets.all })
    },
  })
}

export function useDeleteAssetDocument() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (payload: { id: string; documentId: string }) => {
      const { id, documentId } = payload
      return api.delete(ApiPath.Assets.DOCUMENT(id, documentId)).then((r) => r.data)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.assets.all })
    },
  })
}
