import { describe, expect, it } from "vitest"

import type { Payment, Surcharge, Tariff, BaseTariff } from "@/lib/types"
import {
  defaultSurchargeSelection,
  estimateBillAmount,
  isOverdueWithBalance,
  resolveLateFeePreview,
  sumSelectedSurcharges,
} from "@/lib/utils/lateFee"

const TODAY = "2026-04-15"
const METER = "meter-vl-592020"

function makeBill(overrides: Partial<Payment> = {}): Payment {
  return {
    id: `bill-${Math.random().toString(36).slice(2)}`,
    consumption_id: "consumption-x",
    consumption: { id: "consumption-x", meter_id: METER, month: 1, year: 2026 } as Payment["consumption"],
    total_amount: "30",
    amount_paid: "0",
    status: "overdue",
    due_date: "2026-01-15",
    discount_amount: "0",
    late_fee_amount: "0",
    created_at: "2026-01-01",
    updated_at: "2026-01-01",
    ...overrides,
  }
}

function makeSurcharge(overrides: Partial<Surcharge> = {}): Surcharge {
  return {
    id: "s1",
    name: "Recargo por mora",
    type: "fixed",
    value: "10",
    is_active: true,
    is_default: true,
    created_at: "2026-01-01",
    ...overrides,
  }
}

const JAN = makeBill({ id: "jan", due_date: "2026-01-15", total_amount: "30" })
const FEB = makeBill({ id: "feb", due_date: "2026-02-15", total_amount: "25" })
const MAR = makeBill({ id: "mar", due_date: "2026-03-15", total_amount: "15" })

function preview(overrides: Partial<Parameters<typeof resolveLateFeePreview>[0]> = {}) {
  return resolveLateFeePreview({
    bills: [],
    meterId: METER,
    enabled: true,
    minMonths: 3,
    surcharges: [makeSurcharge()],
    baseAmount: 30,
    today: TODAY,
    ...overrides,
  })
}

describe("resolveLateFeePreview", () => {
  it("Abril: prior bills overdue with balance -> a single default surcharge", () => {
    const result = preview({ bills: [JAN, FEB, MAR] })

    expect(result.eligible).toBe(true)
    expect(result.overdueCount).toBe(3)
    expect(result.items).toHaveLength(1)
    expect(result.items[0].amount).toBe(10)
    expect(result.total).toBe(10)
  })

  it("Mayo: prior bills still overdue -> evaluated again, still one surcharge", () => {
    const mayo = preview({ bills: [JAN, FEB, MAR], today: "2026-05-15" })

    expect(mayo.eligible).toBe(true)
    expect(mayo.items).toHaveLength(1)
  })

  it("Mayo: prior bills settled -> no surcharge", () => {
    const result = preview({
      bills: [
        makeBill({ id: "jan-paid", due_date: "2026-01-15", total_amount: "30", amount_paid: "30", status: "paid" }),
        makeBill({ id: "feb-paid", due_date: "2026-02-15", total_amount: "25", amount_paid: "25" }),
        makeBill({ id: "mar-paid", due_date: "2026-03-15", total_amount: "15", amount_paid: "15" }),
      ],
      today: "2026-05-15",
    })

    expect(result.eligible).toBe(false)
    expect(result.overdueCount).toBe(0)
    expect(result.items).toHaveLength(0)
    expect(result.total).toBe(0)
  })

  it("several overdue bills still produce exactly one surcharge (not one per bill)", () => {
    const many = [
      makeBill({ id: "b1", due_date: "2025-06-15" }),
      makeBill({ id: "b2", due_date: "2025-08-15" }),
      makeBill({ id: "b3", due_date: "2025-10-15" }),
      makeBill({ id: "b4", due_date: "2025-12-15" }),
      makeBill({ id: "b5", due_date: "2026-02-15" }),
    ]
    const result = preview({ bills: many })

    expect(result.overdueCount).toBe(5)
    expect(result.items).toHaveLength(1)
    expect(result.total).toBe(10)
  })

  it("applies every surcharge marked as default, summing their amounts", () => {
    const result = preview({
      bills: [JAN, FEB, MAR],
      surcharges: [
        makeSurcharge({ id: "a", value: "10" }),
        makeSurcharge({ id: "b", value: "5" }),
        makeSurcharge({ id: "c", type: "percentage", value: "2" }),
      ],
    })

    expect(result.items).toHaveLength(3)
    expect(result.total).toBeCloseTo(15.6)
  })

  it("ignores inactive surcharges and non-default surcharges", () => {
    const result = preview({
      bills: [JAN, FEB, MAR],
      surcharges: [
        makeSurcharge({ id: "active-default" }),
        makeSurcharge({ id: "inactive-default", is_active: false }),
        makeSurcharge({ id: "active-not-default", is_default: false }),
      ],
    })

    expect(result.items.map((i) => i.surcharge.id)).toEqual(["active-default"])
  })

  it("not eligible while overdue bills are below minMonths", () => {
    const result = preview({ bills: [JAN] })

    expect(result.overdueCount).toBe(1)
    expect(result.eligible).toBe(false)
    expect(result.items).toHaveLength(0)
  })

  it("not eligible when late fees are disabled", () => {
    const result = preview({ bills: [JAN, FEB, MAR], enabled: false })

    expect(result.eligible).toBe(false)
    expect(result.items).toHaveLength(0)
  })

  it("does not count bills from another meter", () => {
    const otherMeter = makeBill({
      id: "other",
      due_date: "2026-01-15",
      consumption: { id: "c-other", meter_id: "meter-other", month: 1, year: 2026 } as Payment["consumption"],
    })
    const result = preview({ bills: [otherMeter, JAN, FEB] })

    expect(result.overdueCount).toBe(2)
    expect(result.eligible).toBe(false)
  })

  it("does not count bills due today or in the future", () => {
    const dueToday = makeBill({ id: "due-today", due_date: TODAY })
    const dueLater = makeBill({ id: "due-later", due_date: "2026-04-20" })
    const result = preview({ bills: [dueToday, dueLater, JAN, FEB] })

    expect(result.overdueCount).toBe(2)
  })

  it("percentage surcharges without an estimable bill amount show the concept only", () => {
    const result = preview({
      bills: [JAN, FEB, MAR],
      surcharges: [makeSurcharge({ type: "percentage", value: "2" })],
      baseAmount: null,
    })

    expect(result.items).toHaveLength(1)
    expect(result.items[0].amount).toBeUndefined()
    expect(result.total).toBe(0)
  })
})

describe("resolveLateFeePreview manual selection", () => {
  it("applies only the selected active surcharges, ignoring the default flags", () => {
    const result = preview({
      bills: [JAN, FEB, MAR],
      surcharges: [
        makeSurcharge({ id: "a", value: "10", is_default: true }),
        makeSurcharge({ id: "b", value: "5", is_default: false }),
        makeSurcharge({ id: "c", value: "7", is_default: true }),
      ],
      selectedSurchargeIds: ["b"],
    })

    expect(result.eligible).toBe(true)
    expect(result.items.map((i) => i.surcharge.id)).toEqual(["b"])
    expect(result.total).toBe(5)
  })

  it("an empty selection is eligible but applies no surcharge", () => {
    const result = preview({
      bills: [JAN, FEB, MAR],
      selectedSurchargeIds: [],
    })

    expect(result.eligible).toBe(true)
    expect(result.items).toHaveLength(0)
    expect(result.total).toBe(0)
  })

  it("ignores inactive surcharges even when selected", () => {
    const result = preview({
      bills: [JAN, FEB, MAR],
      surcharges: [
        makeSurcharge({ id: "off", is_active: false }),
        makeSurcharge({ id: "on" }),
      ],
      selectedSurchargeIds: ["off", "on"],
    })

    expect(result.items.map((i) => i.surcharge.id)).toEqual(["on"])
  })

  it("sums fixed and percentage amounts from the selection", () => {
    const result = preview({
      bills: [JAN, FEB, MAR],
      surcharges: [
        makeSurcharge({ id: "fixed", type: "fixed", value: "10" }),
        makeSurcharge({ id: "pct", type: "percentage", value: "2" }),
      ],
      selectedSurchargeIds: ["fixed", "pct"],
      baseAmount: 30,
    })

    expect(result.total).toBeCloseTo(10.6)
  })

  it("an unknown selected id simply has no effect in the preview", () => {
    const result = preview({
      bills: [JAN, FEB, MAR],
      surcharges: [makeSurcharge({ id: "a" })],
      selectedSurchargeIds: ["ghost"],
    })

    expect(result.items).toHaveLength(0)
    expect(result.total).toBe(0)
  })
})

describe("defaultSurchargeSelection", () => {
  it("returns the default active surcharge ids when the bill is eligible", () => {
    expect(
      defaultSurchargeSelection({
        bills: [JAN, FEB, MAR],
        meterId: METER,
        enabled: true,
        minMonths: 3,
        surcharges: [
          makeSurcharge({ id: "default" }),
          makeSurcharge({ id: "opt-in", is_default: false }),
        ],
        baseAmount: 30,
        today: TODAY,
      }),
    ).toEqual(["default"])
  })

  it("returns nothing when below the overdue threshold", () => {
    expect(
      defaultSurchargeSelection({
        bills: [JAN],
        meterId: METER,
        enabled: true,
        minMonths: 3,
        surcharges: [makeSurcharge()],
        baseAmount: 30,
        today: TODAY,
      }),
    ).toEqual([])
  })

  it("returns nothing when late fees are disabled", () => {
    expect(
      defaultSurchargeSelection({
        bills: [JAN, FEB, MAR],
        meterId: METER,
        enabled: false,
        minMonths: 3,
        surcharges: [makeSurcharge()],
        baseAmount: 30,
        today: TODAY,
      }),
    ).toEqual([])
  })
})

describe("sumSelectedSurcharges", () => {
  const candidates = [
    makeSurcharge({ id: "fixed", type: "fixed", value: "10" }),
    makeSurcharge({ id: "pct", type: "percentage", value: "2" }),
    makeSurcharge({ id: "inactive", is_active: false }),
  ]

  it("sums fixed and percentage surcharges over the base", () => {
    expect(
      sumSelectedSurcharges(["fixed", "pct"], candidates, {}, 30),
    ).toBeCloseTo(10.6)
  })

  it("prefers the persisted snapshot amount over the current configuration", () => {
    // Config changed after billing: fixed now 15, snapshot keeps 10
    expect(
      sumSelectedSurcharges(["fixed"], candidates, { fixed: 10 }, 30),
    ).toBe(10)
  })

  it("keeps persisted amounts for inactive surcharges that are not candidates", () => {
    expect(
      sumSelectedSurcharges(["gone"], [], { gone: 7.5 }, 30),
    ).toBe(7.5)
  })

  it("ignores unknown ids without a persisted amount", () => {
    expect(sumSelectedSurcharges(["ghost"], candidates, {}, 30)).toBe(0)
  })

  it("counts a deselected selection as zero", () => {
    expect(sumSelectedSurcharges([], candidates, {}, 30)).toBe(0)
  })
})

describe("isOverdueWithBalance", () => {
  it("treats unpaid past-due bills as overdue", () => {
    expect(isOverdueWithBalance(makeBill(), TODAY)).toBe(true)
  })

  it("ignores fully paid bills regardless of status", () => {
    expect(
      isOverdueWithBalance(makeBill({ status: "pending", amount_paid: "30" }), TODAY),
    ).toBe(false)
    expect(
      isOverdueWithBalance(makeBill({ status: "paid", amount_paid: "30" }), TODAY),
    ).toBe(false)
  })

  it("ignores future due dates", () => {
    expect(isOverdueWithBalance(makeBill({ due_date: "2026-04-15" }), TODAY)).toBe(false)
    expect(isOverdueWithBalance(makeBill({ due_date: "2026-06-01" }), TODAY)).toBe(false)
  })

  it("counts partial payments as long as a balance remains", () => {
    expect(
      isOverdueWithBalance(makeBill({ status: "partial", amount_paid: "10" }), TODAY),
    ).toBe(true)
  })
})

describe("estimateBillAmount", () => {
  const baseTariffs: BaseTariff[] = [
    {
      id: "bt-global",
      name: "Global",
      amount: "10",
      valid_from: "2026-01-01",
      is_active: true,
      type_id: null,
      created_at: "2026-01-01",
    },
    {
      id: "bt-typed",
      name: "Typed",
      amount: "12",
      valid_from: "2026-01-01",
      is_active: true,
      type_id: "type-1",
      created_at: "2026-01-01",
    },
  ]
  const tariffs: Tariff[] = [
    {
      id: "t1",
      name: "0-10 m3",
      min_cubic_meters: "0",
      max_cubic_meters: "10",
      price_per_cubic_meter: "5",
      valid_from: "2026-01-01",
      is_active: true,
      created_at: "2026-01-01",
    },
  ]
  const date = new Date("2026-04-01T12:00:00Z")

  it("picks the type-specific base tariff and multiplies m3 by the range price", () => {
    expect(estimateBillAmount(6, "type-1", tariffs, baseTariffs, date)).toBe(30)
  })

  it("falls back to the global base tariff", () => {
    expect(estimateBillAmount(1, "type-unknown", tariffs, baseTariffs, date)).toBe(10)
  })

  it("returns null when no tariff applies", () => {
    expect(estimateBillAmount(6, "type-1", [], [], date)).toBeNull()
    expect(estimateBillAmount(99, "type-1", tariffs, baseTariffs, date)).toBeNull()
  })
})
