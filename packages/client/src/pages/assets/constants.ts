import type {
  AssetCondition,
  AssetMovementType,
  AssetStatus,
} from "@/lib/types"

export const STATUS_LABEL: Record<AssetStatus, string> = {
  active: "assets.status.active",
  loaned: "assets.status.loaned",
  in_maintenance: "assets.status.in_maintenance",
  lost: "assets.status.lost",
  retired: "assets.status.retired",
}

export const STATUS_VARIANT: Record<
  AssetStatus,
  "default" | "secondary" | "destructive" | "outline"
> = {
  active: "default",
  loaned: "secondary",
  in_maintenance: "outline",
  lost: "destructive",
  retired: "destructive",
}

export const CONDITION_LABEL: Record<AssetCondition, string> = {
  new: "assets.condition.new",
  good: "assets.condition.good",
  fair: "assets.condition.fair",
  poor: "assets.condition.poor",
}

export const CONDITION_VARIANT: Record<
  AssetCondition,
  "default" | "secondary" | "destructive" | "outline"
> = {
  new: "default",
  good: "default",
  fair: "secondary",
  poor: "destructive",
}

export const MOVEMENT_LABEL: Record<AssetMovementType, string> = {
  loan: "assets.movementType.loan",
  transfer: "assets.movementType.transfer",
  lost: "assets.movementType.lost",
  retirement: "assets.movementType.retirement",
  restore: "assets.movementType.restore",
}
