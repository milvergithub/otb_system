import { formatCurrency } from "@/lib/utils"
import type { Discount } from "@/lib/types"

export function discountAccessor(discount: Discount, key: string): unknown {
  switch (key) {
    case "name":
      return discount.name
    case "type":
      return discount.type
    case "value":
      return discount.value
    case "description":
      return discount.description ?? ""
    case "is_active":
      return discount.is_active
    case "created_at":
      return discount.created_at
    default:
      return null
  }
}

export function formatValue(discount: Discount): string {
  if (discount.type === "fixed") {
    return formatCurrency(discount.value)
  }
  return `${discount.value}%`
}
