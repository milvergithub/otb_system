import { useEffect, type FormEvent } from "react"
import { useForm, Controller } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useTranslation } from "react-i18next"
import type { TFunction } from "i18next"
import { requiredString } from "@/lib/validation"
import { getApiErrorMessage } from "@/lib/api"
import type { BaseTariff } from "@/lib/types"
import { useAddBaseTariff, useEditBaseTariff } from "@/hooks/tariffs"
import { useMeterTypes } from "@/hooks/meterTypes"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { DatePicker } from "@/components/ui/date-picker"
import { ComboboxSelect } from "@/components/ui/combobox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { toast } from "sonner"

const baseFormSchema = (t: TFunction) =>
  z.object({
    name: requiredString(t),
    amount: requiredString(t),
    valid_from: requiredString(t),
    valid_until: z.string().optional(),
    type_id: z.string().optional(),
  })

type BaseFormValues = z.infer<ReturnType<typeof baseFormSchema>>

const DEFAULT_FORM: BaseFormValues = {
  name: "",
  amount: "",
  valid_from: "",
  valid_until: "",
  type_id: "",
}

interface BaseTariffDialogProps {
  open: boolean
  editing: BaseTariff | null
  onOpenChange: (open: boolean) => void
}

export default function BaseTariffDialog({
  open,
  editing,
  onOpenChange,
}: BaseTariffDialogProps) {
  const { t } = useTranslation()
  const { data: meterTypes = [] } = useMeterTypes()
  const form = useForm<BaseFormValues>({
    resolver: zodResolver(baseFormSchema(t)),
    defaultValues: DEFAULT_FORM,
  })

  const addMutation = useAddBaseTariff()
  const editMutation = useEditBaseTariff()

  useEffect(() => {
    if (!open) return
    form.reset(
      editing
        ? {
            name: editing.name,
            amount: editing.amount,
            valid_from: editing.valid_from,
            valid_until: editing.valid_until ?? "",
            type_id: editing.type_id ?? "",
          }
        : DEFAULT_FORM,
    )
  }, [open, editing, form])

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    form.handleSubmit((values) => {
      const payload = {
        name: values.name,
        amount: Number(values.amount),
        validFrom: values.valid_from,
        validUntil: values.valid_until || undefined,
        typeId: values.type_id || undefined,
      }
      if (editing) {
        editMutation.mutate(
          { id: editing.id, ...payload },
          {
            onSuccess: () => {
              toast.success(t("tariffs.baseUpdated"))
              onOpenChange(false)
            },
            onError: (err) => toast.error(getApiErrorMessage(err)),
          },
        )
      } else {
        addMutation.mutate(payload, {
          onSuccess: () => {
            toast.success(t("tariffs.baseCreated"))
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
            {editing ? t("tariffs.editBaseTitle") : t("tariffs.newBaseTitle")}
          </DialogTitle>
          <DialogDescription>{t("tariffs.baseDescription")}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="base-name">{t("tariffs.name")}</Label>
            <Input
              id="base-name"
              required
              placeholder="e.g., Tarifa Base 2026"
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
              <Label htmlFor="base-amount">{t("tariffs.amount")} (BOB)</Label>
              <Input
                id="base-amount"
                type="number"
                min="0"
                step="0.01"
                required
                {...form.register("amount")}
              />
              {form.formState.errors.amount && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.amount.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="base-type">{t("tariffs.meterType")}</Label>
              <Controller
                control={form.control}
                name="type_id"
                render={({ field }) => (
                  <ComboboxSelect
                    id="base-type"
                    value={field.value || undefined}
                    onValueChange={field.onChange}
                    placeholder={t("tariffs.meterTypePlaceholder")}
                    className="w-full"
                    options={[
                      { label: t("tariffs.allTypes"), value: "" },
                      ...meterTypes.map((mt) => ({ label: mt.name, value: mt.id })),
                    ]}
                  />
                )}
              />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="base-valid-from">{t("tariffs.validFrom")}</Label>
              <Controller
                control={form.control}
                name="valid_from"
                render={({ field }) => (
                  <DatePicker
                    id="base-valid-from"
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
              <Label htmlFor="base-valid-until">
                {t("tariffs.validUntilOptional")}
              </Label>
              <Controller
                control={form.control}
                name="valid_until"
                render={({ field }) => (
                  <DatePicker
                    id="base-valid-until"
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
