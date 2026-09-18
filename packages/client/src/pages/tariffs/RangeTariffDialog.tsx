import { useEffect, type FormEvent } from "react"
import { useForm, Controller } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useTranslation } from "react-i18next"
import type { TFunction } from "i18next"
import { requiredString } from "@/lib/validation"
import { getApiErrorMessage } from "@/lib/api"
import type { Tariff } from "@/lib/types"
import { useAddTariff, useEditTariff } from "@/hooks/tariffs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { DatePicker } from "@/components/ui/date-picker"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { toast } from "sonner"

const rangeFormSchema = (t: TFunction) =>
  z.object({
    name: requiredString(t),
    min_cubic_meters: requiredString(t),
    max_cubic_meters: z.string().optional(),
    price_per_cubic_meter: requiredString(t),
    valid_from: requiredString(t),
    valid_until: z.string().optional(),
  })

type RangeFormValues = z.infer<ReturnType<typeof rangeFormSchema>>

const DEFAULT_FORM: RangeFormValues = {
  name: "",
  min_cubic_meters: "",
  max_cubic_meters: "",
  price_per_cubic_meter: "",
  valid_from: "",
  valid_until: "",
}

interface RangeTariffDialogProps {
  open: boolean
  editing: Tariff | null
  onOpenChange: (open: boolean) => void
}

export default function RangeTariffDialog({
  open,
  editing,
  onOpenChange,
}: RangeTariffDialogProps) {
  const { t } = useTranslation()
  const form = useForm<RangeFormValues>({
    resolver: zodResolver(rangeFormSchema(t)),
    defaultValues: DEFAULT_FORM,
  })

  const addMutation = useAddTariff()
  const editMutation = useEditTariff()

  useEffect(() => {
    if (!open) return
    form.reset(
      editing
        ? {
            name: editing.name,
            min_cubic_meters: editing.min_cubic_meters,
            max_cubic_meters: editing.max_cubic_meters ?? "",
            price_per_cubic_meter: editing.price_per_cubic_meter,
            valid_from: editing.valid_from,
            valid_until: editing.valid_until ?? "",
          }
        : DEFAULT_FORM,
    )
  }, [open, editing, form])

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    form.handleSubmit((values) => {
      const payload = {
        name: values.name,
        minCubicMeters: Number(values.min_cubic_meters),
        maxCubicMeters: values.max_cubic_meters ? Number(values.max_cubic_meters) : undefined,
        pricePerCubicMeter: Number(values.price_per_cubic_meter),
        validFrom: values.valid_from,
        validUntil: values.valid_until || undefined,
      }
      if (editing) {
        editMutation.mutate(
          { id: editing.id, ...payload },
          {
            onSuccess: () => {
              toast.success(t("tariffs.rangeUpdated"))
              onOpenChange(false)
            },
            onError: (err) => toast.error(getApiErrorMessage(err)),
          },
        )
      } else {
        addMutation.mutate(payload, {
          onSuccess: () => {
            toast.success(t("tariffs.rangeCreated"))
            onOpenChange(false)
          },
          onError: (err) => toast.error(getApiErrorMessage(err)),
        })
      }
    })()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {editing ? t("tariffs.editRangeTitle") : t("tariffs.newRangeTitle")}
          </DialogTitle>
          <DialogDescription>{t("tariffs.rangeDescription")}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="range-name">{t("tariffs.name")}</Label>
            <Input
              id="range-name"
              required
              placeholder="e.g., Rango 1-10 m³"
              {...form.register("name")}
            />
            {form.formState.errors.name && (
              <p className="text-sm text-destructive">
                {form.formState.errors.name.message}
              </p>
            )}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="range-min">{t("tariffs.minM3")}</Label>
              <Input
                id="range-min"
                type="number"
                min="0"
                step="0.01"
                required
                {...form.register("min_cubic_meters")}
              />
              {form.formState.errors.min_cubic_meters && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.min_cubic_meters.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="range-max">{t("tariffs.maxM3Optional")}</Label>
              <Input
                id="range-max"
                type="number"
                min="0"
                step="0.01"
                {...form.register("max_cubic_meters")}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="range-price">{t("tariffs.pricePerM3")}</Label>
            <Input
              id="range-price"
              type="number"
              min="0"
              step="0.01"
              required
              {...form.register("price_per_cubic_meter")}
            />
            {form.formState.errors.price_per_cubic_meter && (
              <p className="text-sm text-destructive">
                {form.formState.errors.price_per_cubic_meter.message}
              </p>
            )}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="range-valid-from">{t("tariffs.validFrom")}</Label>
              <Controller
                control={form.control}
                name="valid_from"
                render={({ field }) => (
                  <DatePicker
                    id="range-valid-from"
                    value={field.value ?? ""}
                    onChange={field.onChange}
                  />
                )}
              />
              {form.formState.errors.valid_from && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.valid_from.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="range-valid-until">
                {t("tariffs.validUntilOptional")}
              </Label>
              <Controller
                control={form.control}
                name="valid_until"
                render={({ field }) => (
                  <DatePicker
                    id="range-valid-until"
                    value={field.value ?? ""}
                    onChange={field.onChange}
                  />
                )}
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              {t("common.cancel")}
            </Button>
            <Button type="submit" disabled={addMutation.isPending || editMutation.isPending}>
              {addMutation.isPending || editMutation.isPending ? t("common.saving") : t("common.save")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
