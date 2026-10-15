import { useTranslation } from "react-i18next"
import { formatCurrency } from "@/lib/utils"
import { surchargeAmount } from "@/lib/utils/lateFee"
import type { Surcharge } from "@/lib/types"
import { Checkbox } from "@/components/ui/checkbox"

interface SurchargeSelectListProps {
  surcharges: Surcharge[]
  selectedIds: string[]
  onToggle: (id: string) => void
  /** Bill amount used to estimate percentage surcharges; null = unknown. */
  baseAmount: number | null
  /** Label shown when the amount cannot be estimated yet. */
  unknownAmountLabel?: string
  /** Snapshot amounts recorded when the bill was generated (pay flow). */
  persistedAmounts?: Record<string, number>
  /** Ids the user cannot change (rendered disabled). */
  disabledIds?: string[]
}

export default function SurchargeSelectList({
  surcharges,
  selectedIds,
  onToggle,
  baseAmount,
  unknownAmountLabel,
  persistedAmounts,
  disabledIds,
}: SurchargeSelectListProps) {
  const { t } = useTranslation()

  if (!surcharges.length) {
    return (
      <p className="text-sm text-muted-foreground">{t("billing.noSurcharges")}</p>
    )
  }

  return (
    <div className="rounded-md border p-3 space-y-2 max-h-40 overflow-y-auto">
      {surcharges.map((surcharge) => {
        const amount =
          persistedAmounts?.[surcharge.id] ??
          surchargeAmount(surcharge, baseAmount)
        const disabled = disabledIds?.includes(surcharge.id) ?? false
        return (
          <label
            key={surcharge.id}
            className={
              disabled
                ? "flex items-start gap-2 opacity-60"
                : "flex items-start gap-2 cursor-pointer"
            }
          >
            <Checkbox
              checked={selectedIds.includes(surcharge.id)}
              onCheckedChange={() => onToggle(surcharge.id)}
              disabled={disabled}
              className="mt-0.5"
            />
            <span className="flex-1 min-w-0">
              <span className="text-sm">{surcharge.name}</span>
              {surcharge.description ? (
                <span className="block text-xs text-muted-foreground">
                  {surcharge.description}
                </span>
              ) : null}
              <span className="block text-xs text-muted-foreground">
                {surcharge.type === "fixed"
                  ? formatCurrency(surcharge.value)
                  : `${surcharge.value}%`}
              </span>
            </span>
            <span className="text-sm font-medium text-destructive">
              {amount != null
                ? `+${formatCurrency(amount)}`
                : (unknownAmountLabel ?? "—")}
            </span>
          </label>
        )
      })}
    </div>
  )
}
