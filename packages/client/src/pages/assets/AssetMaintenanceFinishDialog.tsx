import { useEffect, type FormEvent } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useTranslation } from "react-i18next"
import { getApiErrorMessage } from "@/lib/api"
import type { Asset, AssetMaintenance } from "@/lib/types"
import { useFinishMaintenance } from "@/hooks/assets"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import { toast } from "sonner"

const schema = () => z.object({
  finishedAt: z.string().optional(),
  condition: z.string().optional(),
  cost: z.string().optional(),
  provider: z.string().optional(),
  notes: z.string().optional(),
})
type Values = z.infer<ReturnType<typeof schema>>
const DEFAULT: Values = { finishedAt: "", condition: "", cost: "", provider: "", notes: "" }

interface Props { maintenance: AssetMaintenance | null; asset: Asset | null; open: boolean; onOpenChange: (open: boolean) => void }

export default function AssetMaintenanceFinishDialog({ maintenance, asset, open, onOpenChange }: Props) {
  const { t } = useTranslation()
  const form = useForm<Values>({ resolver: zodResolver(schema()), defaultValues: DEFAULT })
  const finishMutation = useFinishMaintenance()

  useEffect(() => { if (open) form.reset(DEFAULT) }, [open, form])

  function submit(e: FormEvent) {
    e.preventDefault()
    form.handleSubmit((values) => {
      if (!maintenance || !asset) return
      finishMutation.mutate(
        {
          id: asset.id,
          maintenanceId: maintenance.id,
          finishedAt: values.finishedAt || undefined,
          condition: values.condition || undefined,
          cost: values.cost ? Number(values.cost) : undefined,
          provider: values.provider || undefined,
          notes: values.notes || undefined,
        },
        {
          onSuccess: () => { toast.success(t("assets.maintenanceFinished")); onOpenChange(false) },
          onError: (err) => toast.error(getApiErrorMessage(err)),
        },
      )
    })()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("assets.finishMaintenanceTitle")}</DialogTitle>
          <DialogDescription>{asset?.code} · {maintenance?.reason}</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} noValidate className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="maintenance-finishedAt">{t("assets.finishedAt")}</Label>
            <Input id="maintenance-finishedAt" type="date" {...form.register("finishedAt")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="maintenance-condition">{t("assets.conditionLabel")}</Label>
            <Input id="maintenance-condition" {...form.register("condition")} placeholder={t("assets.conditionPlaceholder")} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="maintenance-finish-cost">{t("assets.cost")}</Label>
              <Input id="maintenance-finish-cost" type="number" step="0.01" min="0" {...form.register("cost")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="maintenance-finish-provider">{t("assets.provider")}</Label>
              <Input id="maintenance-finish-provider" {...form.register("provider")} />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="maintenance-finish-notes">{t("assets.notes")}</Label>
            <Textarea id="maintenance-finish-notes" rows={2} {...form.register("notes")} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>{t("common.cancel")}</Button>
            <Button type="submit" disabled={finishMutation.isPending}>{finishMutation.isPending ? t("common.saving") : t("common.save")}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
