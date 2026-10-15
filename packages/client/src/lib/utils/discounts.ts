import type { Discount } from "@/lib/types"

/**
 * Estimated amount of one discount over a base amount, mirroring the backend
 * `DiscountService.calculateDiscountAmount`: fixed surcharges/discounts are
 * capped at the base; percentages scale the base.
 */
export function calculateDiscountAmount(
  baseAmount: number,
  discount: Discount,
): number {
  const value = parseFloat(discount.value)
  if (discount.type === "fixed") {
    return Math.min(value, baseAmount)
  }
  return baseAmount * (value / 100)
}
