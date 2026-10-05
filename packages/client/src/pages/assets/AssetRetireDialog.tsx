import { useEffect, type FormEvent } from "react"
import { useForm, Controller } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useTranslation } from "react-i18next"
import type { TFunction } from "i18next"
import { requiredString } from "@/lib/validation"
import { getApiErrorMessage } from "@/lib/api"
import type { Asset } from "@/lib/types"
import { useRetireAsset } from "@/hooks/assets"
import { useSearchUsers } from "@/hooks/users"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { DatePicker } from "@/components/ui/date-picker"
import { ComboboxSelect } from "@/components/ui/combobox"
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import { toast } from "sonner"

const schema = (t: TFunction) => z.object({
  retiredAt: requiredString(t),
  reason: requiredString(t),
  responsibleUserId: z.string().optional(),
  notes: z.string().optional(),
})
type Values = z.infer<ReturnType<typeof schema>>
const DEFAULT: Values = { retiredAt: "", reason: "", responsibleUserId: "", notes: "" }

interface Props { asset: Asset | null; open: boolean; onOpenChange: (open: boolean) => void }

export default function AssetRetireDialog({ asset, open, onOpenChange }: Props) {
  const { t } = useTranslation()
  const form = useForm<Values>({ resolver: zodResolver(schema(t)), defaultValues: DEFAULT })
  const { data: users } = useSearchUsers()
  const retireMutation = useRetireAsset()

  useEffect(() => { if (open) form.reset(DEFAULT) }, [open, form])

  function submit(e: FormEvent) {
    e.preventDefault()
    form.handleSubmit((values) => {
      if (!asset) return
      retireMutation.mutate(
        { id: asset.id, ...values, notes: values.notes || undefined },
        {
          onSuccess: () => { toast.success(t("assets.retired")); onOpenChange(false) },
          onError: (err) => toast.error(getApiErrorMessage(err)),
        },
      )
    })()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("assets.retireTitle")}</DialogTitle>
          <DialogDescription>{asset?.code}</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} noValidate className="space-y-4">
          <div className="space-y-2">
            <Label>{t("assets.retiredAt")}</Label>
            <Controller control={form.control} name="retiredAt" render={({ field }) => (
              <DatePicker value={field.value ?? ""} onChange={field.onChange} />
            )} />
            {form.formState.errors.retiredAt && <p className="text-sm text-destructive">{form.formState.errors.retiredAt.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="retire-reason">{t("assets.retireReason")}</Label>
            <Textarea id="retire-reason" rows={2} {...form.register("reason")} />
            {form.formState.errors.reason && <p className="text-sm text-destructive">{form.formState.errors.reason.message}</p>}
          </div>
          <div className="space-y-2">
            <Label>{t("assets.responsibleUser")}</Label>
            <Controller control={form.control} name="responsibleUserId" render={({ field }) => (
              <ComboboxSelect value={field.value || ""} onValueChange={field.onChange}
                options={[{ label: t("common.none"), value: "" }, ...(users ?? []).map((u) => ({ label: u.full_name, value: u.id }))]} placeholder={t("common.select")} />
            )} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="retire-notes">{t("assets.notes")}</Label>
            <Textarea id="retire-notes" rows={2} {...form.register("notes")} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>{t("common.cancel")}</Button>
            <Button type="submit" disabled={retireMutation.isPending}>{retireMutation.isPending ? t("common.saving") : t("common.save")}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
