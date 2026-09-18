import type { BaseTariff, Tariff } from "@/lib/types"

export function getValidityStatus(
  validFrom: string,
  validUntil: string | null | undefined,
): { label: string; variant: "default" | "secondary" | "destructive" | "outline" } {
  const today = new Date().toISOString().split("T")[0]
  const from = validFrom
  const until = validUntil || "9999-12-31"

  if (today < from) return { label: "common.status.upcoming", variant: "outline" }
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

export function baseTariffAccessor(tariff: BaseTariff, key: string): unknown {
  switch (key) {
    case "name":
      return tariff.name
    case "amount":
      return Number(tariff.amount)
    case "valid_from":
      return tariff.valid_from
    case "valid_until":
      return tariff.valid_until ?? ""
    case "status":
      return getValidityRank(tariff.valid_from, tariff.valid_until)
    default:
      return null
  }
}

export function rangeTariffAccessor(tariff: Tariff, key: string): unknown {
  switch (key) {
    case "name":
      return tariff.name
    case "min_cubic_meters":
      return Number(tariff.min_cubic_meters)
    case "price_per_cubic_meter":
      return Number(tariff.price_per_cubic_meter)
    case "valid_from":
      return tariff.valid_from
    case "valid_until":
      return tariff.valid_until ?? ""
    case "status":
      return getValidityRank(tariff.valid_from, tariff.valid_until)
    default:
      return null
  }
}

export function rangeLabel(tariff: Tariff): string {
  if (!tariff.max_cubic_meters) return `${tariff.min_cubic_meters}+ m³`
  return `${tariff.min_cubic_meters} – ${tariff.max_cubic_meters} m³`
}
