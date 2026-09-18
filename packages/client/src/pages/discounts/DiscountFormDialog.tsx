import { useEffect, type FormEvent } from "react"
import { useForm, useWatch } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useTranslation } from "react-i18next"
import type { TFunction } from "i18next"
import { requiredString } from "@/lib/validation"
import { getApiErrorMessage } from "@/lib/api"
import type { Discount, DiscountType } from "@/lib/types"
import { useAddDiscount, useEditDiscount } from "@/hooks/billing"
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

const discountFormSchema = (t: TFunction) =>
  z.object({
    name: requiredString(t),
    type: requiredString(t),
    value: requiredString(t),
    description: z.string().optional(),
    is_active: z.boolean(),
  })

type DiscountFormValues = z.infer<ReturnType<typeof discountFormSchema>>

const DEFAULT_FORM: DiscountFormValues = {
  name: "",
  type: "fixed",
  value: "",
  description: "",
  is_active: true,
}

interface DiscountFormDialogProps {
  open: boolean
  editing: Discount | null
  onOpenChange: (open: boolean) => void
}

export default function DiscountFormDialog({
  open,
  editing,
  onOpenChange,
}: DiscountFormDialogProps) {
  const { t } = useTranslation()
  const form = useForm<DiscountFormValues>({
    resolver: zodResolver(discountFormSchema(t)),
    defaultValues: DEFAULT_FORM,
  })

  const watchType = useWatch({ control: form.control, name: "type" })
  const watchIsActive = useWatch({ control: form.control, name: "is_active" })

  const addMutation = useAddDiscount()
  const editMutation = useEditDiscount()

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
          }
        : DEFAULT_FORM,
    )
  }, [open, editing, form])

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    form.handleSubmit((values) => {
      const payload = {
        name: values.name,
        type: values.type as DiscountType,
        value: parseFloat(values.value),
        description: values.description || undefined,
        is_active: values.is_active,
      }
      if (editing) {
        editMutation.mutate(
          { id: editing.id, ...payload },
          {
            onSuccess: () => {
              toast.success(t("discounts.updated"))
              onOpenChange(false)
            },
            onError: (err) => toast.error(getApiErrorMessage(err)),
          },
        )
      } else {
        addMutation.mutate(payload, {
          onSuccess: () => {
            toast.success(t("discounts.createdToast"))
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
            {editing ? t("discounts.editTitle") : t("discounts.newTitle")}
          </DialogTitle>
          <DialogDescription>
            {editing
              ? t("discounts.editDescription")
              : t("discounts.newDescription")}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">{t("discounts.name")}</Label>
            <Input
              id="name"
              required
              placeholder="e.g. Social discount"
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
              <Label>{t("discounts.typeLabel")}</Label>
              <ComboboxSelect
                value={watchType}
                onValueChange={(v) => form.setValue("type", v)}
                className="w-full"
                options={[
                  { label: t("discounts.type.fixed"), value: "fixed" },
                  { label: t("discounts.type.percentage"), value: "percentage" },
                ]}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="value">
                {watchType === "fixed"
                  ? t("discounts.amount")
                  : t("discounts.percentage")}
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
            <Label htmlFor="description">{t("discounts.descriptionOptional")}</Label>
            <Input
              id="description"
              placeholder={t("discounts.descriptionPlaceholder")}
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
