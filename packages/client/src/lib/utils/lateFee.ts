import type { BaseTariff, Payment, Surcharge, Tariff } from "@/lib/types"

export interface LateFeePreviewItem {
  surcharge: Surcharge
  /** Estimated amount; undefined when the bill amount could not be estimated. */
  amount?: number
}

export interface LateFeePreview {
  enabled: boolean
  eligible: boolean
  overdueCount: number
  items: LateFeePreviewItem[]
  total: number
}

function toDay(date: Date): string {
  return date.toISOString().split("T")[0]
}

function validOn(entry: { valid_from: string; valid_until?: string | null }, day: string): boolean {
  return entry.valid_from <= day && (!entry.valid_until || entry.valid_until >= day)
}

/**
 * A prior bill is overdue with pending balance when its due date has passed,
 * it is not settled and there is money left to pay. Mirrors the backend rule
 * used when generating a bill.
 */
export function isOverdueWithBalance(bill: Payment, today: string): boolean {
  if (bill.status === "paid") return false
  if (!bill.due_date || bill.due_date >= today) return false
  return parseFloat(bill.total_amount) - parseFloat(bill.amount_paid) > 0.001
}

/**
 * Client-side estimate of the amount a new bill would cost, mirroring the
 * server formula (max of base tariff and m3 * range price). Only used for the
 * generate-bill preview; the server recomputes the authoritative figure.
 */
export function estimateBillAmount(
  cubicMeters: number,
  typeId: string | undefined,
  tariffs: Tariff[] | undefined,
  baseTariffs: BaseTariff[] | undefined,
  date: Date = new Date(),
): number | null {
  const day = toDay(date)
  const activeBase = (baseTariffs ?? []).filter((bt) => bt.is_active && validOn(bt, day))
  const base = typeId
    ? activeBase.find((bt) => bt.type_id === typeId) ??
      activeBase.find((bt) => !bt.type_id)
    : activeBase.find((bt) => !bt.type_id)
  if (!base) return null

  const range = (tariffs ?? []).find(
    (t) =>
      t.is_active &&
      validOn(t, day) &&
      parseFloat(t.min_cubic_meters) <= cubicMeters &&
      (t.max_cubic_meters == null || parseFloat(t.max_cubic_meters) >= cubicMeters),
  )
  if (!range) return null

  const consumptionTotal = cubicMeters * parseFloat(range.price_per_cubic_meter)
  return Math.max(parseFloat(base.amount), consumptionTotal)
}

function surchargeAmount(surcharge: Surcharge, baseAmount: number | null | undefined): number | undefined {
  const value = parseFloat(surcharge.value)
  if (surcharge.type === "fixed") return Math.max(0, value)
  if (baseAmount == null) return undefined
  return Math.max(0, baseAmount * (value / 100))
}

/**
 * Preview-only evaluation of the late fee for a bill that is about to be
 * generated: eligible when late fees are enabled and the meter has at least
 * `minMonths` prior bills overdue with pending balance. All surcharges marked
 * as default apply once, each at most one time per bill.
 */
export function resolveLateFeePreview(options: {
  bills: Payment[]
  meterId: string
  enabled: boolean
  minMonths: number
  surcharges: Surcharge[] | undefined
  baseAmount?: number | null
  today?: string
}): LateFeePreview {
  const { bills, meterId, enabled, surcharges, baseAmount } = options
  const today = options.today ?? toDay(new Date())
  const minMonths =
    Number.isFinite(options.minMonths) && options.minMonths > 0 ? options.minMonths : 3

  const overdueCount = bills.filter(
    (bill) =>
      (!bill.consumption?.meter_id || bill.consumption.meter_id === meterId) &&
      isOverdueWithBalance(bill, today),
  ).length

  const eligible = enabled && overdueCount >= minMonths
  if (!eligible) {
    return { enabled, eligible: false, overdueCount, items: [], total: 0 }
  }

  const items = (surcharges ?? [])
    .filter((s) => s.is_active && s.is_default)
    .map((surcharge) => ({
      surcharge,
      amount: surchargeAmount(surcharge, baseAmount),
    }))
  const total = items.reduce((sum, item) => sum + (item.amount ?? 0), 0)

  return { enabled, eligible: true, overdueCount, items, total }
}
