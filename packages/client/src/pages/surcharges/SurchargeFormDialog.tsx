import { useEffect, type FormEvent } from "react"
import { useForm, useWatch } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useTranslation } from "react-i18next"
import type { TFunction } from "i18next"
import { requiredString } from "@/lib/validation"
import { getApiErrorMessage } from "@/lib/api"
import type { Surcharge, SurchargeType } from "@/lib/types"
import { useAddSurcharge, useEditSurcharge } from "@/hooks/billing"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Switch } from "@/components/ui/switch"
import { ComboboxSelect } from "@/components/ui/combobox"
import { toast } from "sonner"

const surchargeFormSchema = (t: TFunction) =>
  z.object({
    name: requiredString(t),
    type: requiredString(t),
    value: requiredString(t),
    description: z.string().optional(),
    is_active: z.boolean(),
    is_default: z.boolean(),
  })

type SurchargeFormValues = z.infer<ReturnType<typeof surchargeFormSchema>>

const DEFAULT_FORM: SurchargeFormValues = {
  name: "",
  type: "fixed",
  value: "",
  description: "",
  is_active: true,
  is_default: false,
}

interface SurchargeFormDialogProps {
  open: boolean
  editing: Surcharge | null
  onOpenChange: (open: boolean) => void
}

export default function SurchargeFormDialog({
  open,
  editing,
  onOpenChange,
}: SurchargeFormDialogProps) {
  const { t } = useTranslation()
  const form = useForm<SurchargeFormValues>({
    resolver: zodResolver(surchargeFormSchema(t)),
    defaultValues: DEFAULT_FORM,
  })

  const watchType = useWatch({ control: form.control, name: "type" })
  const watchIsActive = useWatch({ control: form.control, name: "is_active" })
  const watchIsDefault = useWatch({ control: form.control, name: "is_default" })

  const addMutation = useAddSurcharge()
  const editMutation = useEditSurcharge()

  useEffect(() => {
    if (!open) return
    form.reset(
      editing
        ? {
            name: editing.name,
            type: editing.type,
            value: editing.value,
            description: editing.description ?? "",
            is_active: editing.is_active,
            is_default: editing.is_default,
          }
        : DEFAULT_FORM,
    )
  }, [open, editing, form])

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    form.handleSubmit((values) => {
      const payload = {
        name: values.name,
        type: values.type as SurchargeType,
        value: parseFloat(values.value),
        description: values.description || undefined,
        is_active: values.is_active,
        is_default: values.is_default,
      }
      if (editing) {
        editMutation.mutate(
          { id: editing.id, ...payload },
          {
            onSuccess: () => {
              toast.success(t("surcharges.updated"))
              onOpenChange(false)
            },
            onError: (err) => toast.error(getApiErrorMessage(err)),
          },
        )
      } else {
        addMutation.mutate(payload, {
          onSuccess: () => {
            toast.success(t("surcharges.createdToast"))
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
            {editing ? t("surcharges.editTitle") : t("surcharges.newTitle")}
          </DialogTitle>
          <DialogDescription>
            {editing
              ? t("surcharges.editDescription")
              : t("surcharges.newDescription")}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">{t("surcharges.name")}</Label>
            <Input
              id="name"
              required
              placeholder="e.g. Social surcharge"
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
              <Label>{t("surcharges.typeLabel")}</Label>
              <ComboboxSelect
                value={watchType}
                onValueChange={(v) => form.setValue("type", v)}
                className="w-full"
                options={[
                  { label: t("surcharges.type.fixed"), value: "fixed" },
                  { label: t("surcharges.type.percentage"), value: "percentage" },
                ]}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="value">
                {watchType === "fixed"
                  ? t("surcharges.amount")
                  : t("surcharges.percentage")}
              </Label>
              <Input
                id="value"
                type="number"
                step="0.01"
                min="0"
                required
                placeholder={watchType === "fixed" ? "50.00" : "10"}
                {...form.register("value")}
              />
              {form.formState.errors.value && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.value.message}
                </p>
              )}
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">{t("surcharges.descriptionOptional")}</Label>
            <Input
              id="description"
              placeholder={t("surcharges.descriptionPlaceholder")}
              {...form.register("description")}
            />
          </div>
          <div className="flex items-center gap-3">
            <Switch
              checked={watchIsActive}
              onCheckedChange={(checked) => form.setValue("is_active", checked)}
            />
            <Label>{t("common.status.active")}</Label>
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <Switch
                checked={watchIsDefault}
                onCheckedChange={(checked) => form.setValue("is_default", checked)}
              />
              <Label>{t("surcharges.defaultLabel")}</Label>
            </div>
            <p className="text-sm text-muted-foreground">
              {t("surcharges.defaultDescription")}
            </p>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
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
