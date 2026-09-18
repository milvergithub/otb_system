import { useEffect, type FormEvent } from "react"
import { useForm, Controller } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useTranslation } from "react-i18next"
import type { TFunction } from "i18next"
import { requiredString } from "@/lib/validation"
import { getApiErrorMessage } from "@/lib/api"
import { useCopyTariffs } from "@/hooks/tariffs"
import { Button } from "@/components/ui/button"
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

const copyFormSchema = (t: TFunction) =>
  z.object({
    new_valid_from: requiredString(t),
    new_valid_until: z.string().optional(),
  })

type CopyFormValues = z.infer<ReturnType<typeof copyFormSchema>>

const DEFAULT_FORM: CopyFormValues = {
  new_valid_from: "",
  new_valid_until: "",
}

interface CopyTariffsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export default function CopyTariffsDialog({
  open,
  onOpenChange,
}: CopyTariffsDialogProps) {
  const { t } = useTranslation()
  const form = useForm<CopyFormValues>({
    resolver: zodResolver(copyFormSchema(t)),
    defaultValues: DEFAULT_FORM,
  })

  const copyMutation = useCopyTariffs()

  useEffect(() => {
    if (open) form.reset(DEFAULT_FORM)
  }, [open, form])

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    form.handleSubmit((values) => {
      copyMutation.mutate(
        {
          newValidFrom: values.new_valid_from,
          newValidUntil: values.new_valid_until || undefined,
        },
        {
          onSuccess: () => {
            toast.success(t("tariffs.copied"))
            onOpenChange(false)
          },
          onError: (err) => toast.error(getApiErrorMessage(err)),
        },
      )
    })()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("tariffs.copyTitle")}</DialogTitle>
          <DialogDescription>{t("tariffs.copyDescription")}</DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="copy-valid-from">{t("tariffs.newValidFrom")}</Label>
              <Controller
                control={form.control}
                name="new_valid_from"
                render={({ field }) => (
                  <DatePicker
                    id="copy-valid-from"
                    value={field.value ?? ""}
                    onChange={field.onChange}
                  />
                )}
              />
              {form.formState.errors.new_valid_from && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.new_valid_from.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="copy-valid-until">
                {t("tariffs.newValidUntilOptional")}
              </Label>
              <Controller
                control={form.control}
                name="new_valid_until"
                render={({ field }) => (
                  <DatePicker
                    id="copy-valid-until"
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
            <Button type="submit" disabled={copyMutation.isPending}>
              {copyMutation.isPending ? t("common.copying") : t("common.copy")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
