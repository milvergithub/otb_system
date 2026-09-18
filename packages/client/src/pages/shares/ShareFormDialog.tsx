import { useEffect, type FormEvent } from "react"
import { useForm, Controller } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useTranslation } from "react-i18next"
import type { TFunction } from "i18next"
import { requiredString } from "@/lib/validation"
import { getApiErrorMessage } from "@/lib/api"
import type { WaterShare } from "@/lib/types"
import { useAddShare, useEditShare } from "@/hooks/shares"
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

const shareFormSchema = (t: TFunction) =>
  z.object({
    name: requiredString(t),
    amount: requiredString(t),
    valid_from: requiredString(t),
    valid_until: z.string().optional(),
  })

type ShareFormValues = z.infer<ReturnType<typeof shareFormSchema>>

const DEFAULT_FORM: ShareFormValues = {
  name: "",
  amount: "",
  valid_from: "",
  valid_until: "",
}

interface ShareFormDialogProps {
  open: boolean
  editing: WaterShare | null
  onOpenChange: (open: boolean) => void
}

export default function ShareFormDialog({
  open,
  editing,
  onOpenChange,
}: ShareFormDialogProps) {
  const { t } = useTranslation()
  const form = useForm<ShareFormValues>({
    resolver: zodResolver(shareFormSchema(t)),
    defaultValues: DEFAULT_FORM,
  })

  const addMutation = useAddShare()
  const editMutation = useEditShare()

  useEffect(() => {
    if (!open) return
    form.reset(
      editing
        ? {
            name: editing.name,
            amount: editing.amount,
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
        amount: Number(values.amount),
        validFrom: values.valid_from,
        validUntil: values.valid_until || undefined,
      }
      if (editing) {
        editMutation.mutate(
          { id: editing.id, ...payload },
          {
            onSuccess: () => {
              toast.success(t("shares.updated"))
              onOpenChange(false)
            },
            onError: (err) => toast.error(getApiErrorMessage(err)),
          },
        )
      } else {
        addMutation.mutate(payload, {
          onSuccess: () => {
            toast.success(t("shares.created"))
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
          <DialogTitle>{editing ? t("shares.editTitle") : t("shares.newTitle")}</DialogTitle>
          <DialogDescription>
            {t("shares.dialogDescription")}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="share-name">{t("shares.name")}</Label>
            <Input
              id="share-name"
              required
              placeholder="e.g., Acción de agua 2026"
              {...form.register("name")}
            />
            {form.formState.errors.name && (
              <p className="text-sm text-destructive">
                {form.formState.errors.name.message}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="share-amount">{t("shares.amount")} (BOB)</Label>
            <Input
              id="share-amount"
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
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="share-valid-from">{t("shares.validFrom")}</Label>
              <Controller
                control={form.control}
                name="valid_from"
                render={({ field }) => (
                  <DatePicker
                    id="share-valid-from"
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
              <Label htmlFor="share-valid-until">{t("shares.validUntilOptional")}</Label>
              <Controller
                control={form.control}
                name="valid_until"
                render={({ field }) => (
                  <DatePicker
                    id="share-valid-until"
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
