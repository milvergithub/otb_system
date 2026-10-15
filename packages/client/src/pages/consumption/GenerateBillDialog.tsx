import { useEffect, useMemo, type FormEvent } from "react"
import { useForm, useWatch } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { getApiErrorMessage } from "@/lib/api"
import { formatCurrency, monthNames } from "@/lib/utils"
import { estimateBillAmount, resolveLateFeePreview } from "@/lib/utils/lateFee"
import type { Consumption } from "@/lib/types"
import {
  useActiveDiscounts,
  useActiveSurcharges,
  useGenerateBill,
  useMeterBills,
} from "@/hooks/billing"
import { useSettings } from "@/hooks/settings"
import { useSearchBaseTariffs, useSearchTariffs } from "@/hooks/tariffs"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { toast } from "sonner"

type GenerateFormValues = {
  discount_ids: string[]
}

const DEFAULT_GENERATE_FORM: GenerateFormValues = {
  discount_ids: [],
}

interface GenerateBillDialogProps {
  generating: Consumption | null
  onOpenChange: (open: boolean) => void
}

export default function GenerateBillDialog({
  generating,
  onOpenChange,
}: GenerateBillDialogProps) {
  const { t } = useTranslation()
  const months = monthNames()
  const generateForm = useForm<GenerateFormValues>({
    defaultValues: DEFAULT_GENERATE_FORM,
  })

  const watchGenerateDiscountIds = useWatch({
    control: generateForm.control,
    name: "discount_ids",
  })

  const isOpen = !!generating
  const { data: discounts } = useActiveDiscounts(isOpen)
  const { data: surcharges } = useActiveSurcharges(isOpen)
  const { data: meterBills } = useMeterBills(generating?.meter_id, isOpen)
  const { data: settings } = useSettings()
  const minMonths = parseInt(settings?.late_fee_min_months ?? "", 10) || 3
  const { data: tariffs } = useSearchTariffs(false, isOpen)
  const { data: baseTariffs } = useSearchBaseTariffs(isOpen)
  const generateMutation = useGenerateBill()

  const baseAmount = useMemo(() => {
    if (!generating) return null
    return estimateBillAmount(
      parseFloat(generating.cubic_meters),
      generating.meter?.type_id,
      tariffs,
      baseTariffs,
    )
  }, [generating, tariffs, baseTariffs])

  // Preview only: the server recomputes and validates every amount when the
  // bill is actually generated.
  const lateFee = useMemo(() => {
    if (!generating) return null
    return resolveLateFeePreview({
      bills: meterBills?.items ?? [],
      meterId: generating.meter_id,
      enabled: settings?.late_fee_enabled === "true",
      minMonths,
      surcharges,
      baseAmount,
    })
  }, [generating, meterBills, settings, minMonths, surcharges, baseAmount])

  useEffect(() => {
    if (generating) generateForm.reset(DEFAULT_GENERATE_FORM)
  }, [generating, generateForm])

  function toggleGenerateDiscount(discountId: string) {
    generateForm.setValue(
      "discount_ids",
      watchGenerateDiscountIds.includes(discountId)
        ? watchGenerateDiscountIds.filter((id) => id !== discountId)
        : [...watchGenerateDiscountIds, discountId],
    )
  }

  function handleGenerate(e: FormEvent) {
    e.preventDefault()
    generateForm.handleSubmit((values) => {
      generateMutation.mutate(
        {
          consumptionId: generating!.id,
          discountIds: values.discount_ids,
        },
        {
          onSuccess: () => {
            toast.success(t("consumption.billGenerated"))
            onOpenChange(false)
          },
          onError: (err) => toast.error(getApiErrorMessage(err)),
        },
      )
    })()
  }

  const showLateFeeBox = lateFee?.enabled && lateFee.overdueCount > 0

  return (
    <AlertDialog
      open={isOpen}
      onOpenChange={(open) => !open && onOpenChange(false)}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("consumption.generateTitle")}</AlertDialogTitle>
          <AlertDialogDescription>
            {t("consumption.generateDesc", {
              code: generating ? (generating.meter?.code ?? "") : "",
              period: generating
                ? `${months[generating.month - 1]} ${generating.year}`
                : "",
            })}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <form onSubmit={handleGenerate} noValidate className="space-y-3">
          {baseAmount != null ? (
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">
                {t("consumption.originalAmount")}
              </span>
              <span className="font-medium">{formatCurrency(baseAmount)}</span>
            </div>
          ) : null}
          {showLateFeeBox ? (
            <div className="space-y-2">
              <Label>{t("billing.lateFee")}</Label>
              <div className="space-y-2 rounded-md border border-destructive/40 bg-destructive/5 p-3">
                <p className="text-sm text-destructive">
                  {t("consumption.overdueNotice", {
                    count: lateFee.overdueCount,
                  })}
                </p>
                {lateFee.eligible ? (
                  <>
                    {lateFee.items.length ? (
                      lateFee.items.map(({ surcharge, amount }) => (
                        <div
                          key={surcharge.id}
                          className="flex items-center justify-between gap-3 text-sm"
                        >
                          <span>
                            {surcharge.name} —{" "}
                            {surcharge.type === "fixed"
                              ? formatCurrency(surcharge.value)
                              : `${surcharge.value}%`}
                          </span>
                          <span className="font-medium text-destructive">
                            {amount != null
                              ? `+${formatCurrency(amount)}`
                              : t("consumption.surchargeCalculated")}
                          </span>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        {t("consumption.noDefaultSurcharge")}
                      </p>
                    )}
                    {lateFee.items.length ? (
                      <>
                        <div className="flex items-center justify-between gap-3 border-t pt-2 text-sm font-semibold text-destructive">
                          <span>{t("consumption.surchargeTotal")}</span>
                          <span>{`+${formatCurrency(lateFee.total)}`}</span>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {t("consumption.previewEstimateNote")}
                        </p>
                      </>
                    ) : null}
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">
                    {t("consumption.surchargeBelowThreshold", {
                      count: lateFee.overdueCount,
                      min: minMonths,
                    })}
                  </p>
                )}
              </div>
            </div>
          ) : null}
          <Label>{t("consumption.applyDiscounts")}</Label>
          <div className="rounded-md border p-3 space-y-2 max-h-40 overflow-y-auto">
            {discounts?.length ? (
              discounts.map((d) => (
                <label
                  key={d.id}
                  className="flex items-center gap-2 cursor-pointer"
                >
                  <Checkbox
                    checked={watchGenerateDiscountIds.includes(d.id)}
                    onCheckedChange={() => toggleGenerateDiscount(d.id)}
                  />
                  <span className="text-sm">
                    {d.name} —{" "}
                    {d.type === "fixed"
                      ? formatCurrency(d.value)
                      : `${d.value}%`}
                  </span>
                </label>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">
                {t("common.noDiscounts")}
              </p>
            )}
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel type="button">
              {t("common.cancel")}
            </AlertDialogCancel>
            <AlertDialogAction type="submit">
              {generateMutation.isPending
                ? t("consumption.generating")
                : t("consumption.generate")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </form>
      </AlertDialogContent>
    </AlertDialog>
  )
}
