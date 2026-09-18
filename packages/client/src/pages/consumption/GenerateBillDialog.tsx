import { useEffect, type FormEvent } from "react"
import { useForm, useWatch } from "react-hook-form"
import { useTranslation } from "react-i18next"
import { getApiErrorMessage } from "@/lib/api"
import { formatCurrency, monthNames } from "@/lib/utils"
import type { Consumption } from "@/lib/types"
import { useActiveDiscounts, useGenerateBill } from "@/hooks/billing"
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

  const { data: discounts } = useActiveDiscounts()
  const generateMutation = useGenerateBill()

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

  return (
    <AlertDialog
      open={!!generating}
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
