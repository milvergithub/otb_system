import type { WaterShare } from "@/lib/types"

export function getValidityStatus(
  validFrom: string,
  validUntil: string | null | undefined,
): { label: string; variant: "default" | "secondary" | "destructive" | "outline" } {
  const today = new Date().toISOString().split("T")[0]
  const until = validUntil || "9999-12-31"

  if (today < validFrom) return { label: "common.status.upcoming", variant: "outline" }
  if (today > until) return { label: "common.status.expired", variant: "destructive" }
  return { label: "common.status.active", variant: "default" }
}

export function getValidityRank(
  validFrom: string,
  validUntil: string | null | undefined,
): number {
  const today = new Date().toISOString().split("T")[0]
  const until = validUntil || "9999-12-31"
  if (today < validFrom) return 2
  if (today > until) return 1
  return 0
}

export function shareAccessor(share: WaterShare, key: string): unknown {
  switch (key) {
    case "name":
      return share.name
    case "amount":
      return Number(share.amount)
    case "valid_from":
      return share.valid_from
    case "valid_until":
      return share.valid_until ?? ""
    case "status":
      return getValidityRank(share.valid_from, share.valid_until)
    default:
      return null
  }
}
