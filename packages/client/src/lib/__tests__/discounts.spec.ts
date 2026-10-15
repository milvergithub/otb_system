import { describe, expect, it } from "vitest"

import type { Discount } from "@/lib/types"
import { calculateDiscountAmount } from "@/lib/utils/discounts"

function makeDiscount(overrides: Partial<Discount> = {}): Discount {
  return {
    id: "d1",
    name: "Descuento",
    type: "fixed",
    value: "10",
    is_active: true,
    created_at: "2026-01-01",
    ...overrides,
  }
}

describe("calculateDiscountAmount", () => {
  it("uses the value directly for fixed discounts", () => {
    expect(calculateDiscountAmount(100, makeDiscount({ type: "fixed", value: "10" }))).toBe(10)
  })

  it("caps fixed discounts at the base amount", () => {
    expect(calculateDiscountAmount(5, makeDiscount({ type: "fixed", value: "10" }))).toBe(5)
  })

  it("scales the base for percentage discounts", () => {
    expect(
      calculateDiscountAmount(200, makeDiscount({ type: "percentage", value: "15" })),
    ).toBe(30)
  })
})
