import { formatDate } from "@/lib/utils"
import type {
  Asset,
  AssetCategory,
  AssetLocation,
  AssetMaintenance,
  AssetMovement,
} from "@/lib/types"

export function assetAccessor(asset: Asset, key: string): unknown {
  switch (key) {
    case "code":
      return asset.code
    case "name":
      return asset.name
    case "category":
      return asset.category?.name ?? ""
    case "location":
      return asset.location?.name ?? ""
    case "status":
      return asset.status
    case "condition":
      return asset.condition
    case "responsible":
      return responsibleLabel(asset)
    case "value":
      return asset.acquisition_value ?? "0"
    case "created_at":
      return asset.created_at
    default:
      return null
  }
}

export function responsibleLabel(asset: Asset): string {
  const user = asset.currentResponsibleUser?.full_name
  if (user) return user
  const member = asset.currentResponsibleMember
    ? `${asset.currentResponsibleMember.first_name} ${asset.currentResponsibleMember.last_name}`
    : ""
  return member
}

export function formatMoney(value?: string | null): string {
  const amount = parseFloat(value ?? "0")
  return Number.isFinite(amount) ? amount.toFixed(2) : "0.00"
}

export function assetCurrentLocation(asset: Asset): string {
  return asset.location?.name ?? "—"
}

export function assetCurrentCategory(asset: Asset): string {
  return asset.category?.name ?? "—"
}

export function formatMovementRange(movement: AssetMovement): string {
  const from = movement.fromLocation?.name ?? "—"
  const to = movement.toLocation?.name ?? "—"
  return `${from} → ${to}`
}

export function maintenanceState(maintenance: AssetMaintenance): "open" | "closed" {
  return maintenance.finished_at ? "closed" : "open"
}

export function summarizeMaintenanceCost(items?: AssetMaintenance[]): number {
  return (items ?? []).reduce((sum, item) => sum + parseFloat(item.cost ?? "0"), 0)
}
