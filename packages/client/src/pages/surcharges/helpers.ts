import { formatCurrency } from "@/lib/utils"
import type { Surcharge } from "@/lib/types"

export function surchargeAccessor(surcharge: Surcharge, key: string): unknown {
  switch (key) {
    case "name":
      return surcharge.name
    case "type":
      return surcharge.type
    case "value":
      return surcharge.value
    case "description":
      return surcharge.description ?? ""
    case "is_active":
      return surcharge.is_active
    case "is_default":
      return surcharge.is_default
    case "created_at":
      return surcharge.created_at
    default:
      return null
  }
}

export function formatValue(surcharge: Surcharge): string {
  if (surcharge.type === "fixed") {
    return formatCurrency(surcharge.value)
  }
  return `${surcharge.value}%`
}
