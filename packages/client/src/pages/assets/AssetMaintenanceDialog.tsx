import { useEffect, type FormEvent } from "react"
import { useForm, Controller } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useTranslation } from "react-i18next"
import type { TFunction } from "i18next"
import { requiredString } from "@/lib/validation"
import { getApiErrorMessage } from "@/lib/api"
import type { Asset } from "@/lib/types"
import { useAddMaintenance } from "@/hooks/assets"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { DatePicker } from "@/components/ui/date-picker"
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import { toast } from "sonner"

const schema = (t: TFunction) => z.object({
  reason: requiredString(t),
  startedAt: z.string().optional(),
  cost: z.string().optional(),
  provider: z.string().optional(),
  notes: z.string().optional(),
})
type Values = z.infer<ReturnType<typeof schema>>
const DEFAULT: Values = { reason: "", startedAt: "", cost: "", provider: "", notes: "" }

interface Props { asset: Asset | null; open: boolean; onOpenChange: (open: boolean) => void }

export default function AssetMaintenanceDialog({ asset, open, onOpenChange }: Props) {
  const { t } = useTranslation()
  const form = useForm<Values>({ resolver: zodResolver(schema(t)), defaultValues: DEFAULT })
  const createMutation = useAddMaintenance()

  useEffect(() => { if (open) form.reset(DEFAULT) }, [open, form])

  function submit(e: FormEvent) {
    e.preventDefault()
    form.handleSubmit((values) => {
      if (!asset) return
      createMutation.mutate(
        { id: asset.id, reason: values.reason.trim(), startedAt: values.startedAt || undefined, cost: values.cost ? Number(values.cost) : undefined, provider: values.provider || undefined, notes: values.notes || undefined },
        {
          onSuccess: () => { toast.success(t("assets.maintenanceStarted")); onOpenChange(false) },
          onError: (err) => toast.error(getApiErrorMessage(err)),
        },
      )
    })()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("assets.maintenanceTitle")}</DialogTitle>
          <DialogDescription>{asset?.code}</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} noValidate className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="maintenance-reason">{t("assets.reason")}</Label>
            <Input id="maintenance-reason" {...form.register("reason")} />
            {form.formState.errors.reason && <p className="text-sm text-destructive">{form.formState.errors.reason.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="maintenance-startedAt">{t("assets.startDate")}</Label>
            <Controller
              control={form.control}
              name="startedAt"
              render={({ field }) => (
                <DatePicker id="maintenance-startedAt" value={field.value ?? ""} onChange={field.onChange} />
              )}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="maintenance-cost">{t("assets.cost")}</Label>
              <Input id="maintenance-cost" type="number" step="0.01" min="0" {...form.register("cost")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="maintenance-provider">{t("assets.provider")}</Label>
              <Input id="maintenance-provider" {...form.register("provider")} />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="maintenance-notes">{t("assets.notes")}</Label>
            <Textarea id="maintenance-notes" rows={2} {...form.register("notes")} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>{t("common.cancel")}</Button>
            <Button type="submit" disabled={createMutation.isPending}>{createMutation.isPending ? t("common.saving") : t("common.save")}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
