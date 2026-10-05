import { useEffect, type FormEvent } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useTranslation } from "react-i18next"
import type { TFunction } from "i18next"
import { getApiErrorMessage } from "@/lib/api"
import type { Asset } from "@/lib/types"
import { useReportLostAsset } from "@/hooks/assets"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import { toast } from "sonner"

const schema = () => z.object({ reason: z.string().optional() })
type Values = z.infer<ReturnType<typeof schema>>
const DEFAULT: Values = { reason: "" }

interface Props { asset: Asset | null; open: boolean; onOpenChange: (open: boolean) => void }

export default function AssetLostDialog({ asset, open, onOpenChange }: Props) {
  const { t } = useTranslation()
  const form = useForm<Values>({ resolver: zodResolver(schema()), defaultValues: DEFAULT })
  const lostMutation = useReportLostAsset()

  useEffect(() => { if (open) form.reset(DEFAULT) }, [open, form])

  function submit(e: FormEvent) {
    e.preventDefault()
    form.handleSubmit((values) => {
      if (!asset) return
      lostMutation.mutate(
        { id: asset.id, reason: values.reason || undefined },
        {
          onSuccess: () => { toast.success(t("assets.markedLost")); onOpenChange(false) },
          onError: (err) => toast.error(getApiErrorMessage(err)),
        },
      )
    })()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("assets.lostTitle")}</DialogTitle>
          <DialogDescription>{asset?.code}</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} noValidate className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="lost-reason">{t("assets.reason")}</Label>
            <Textarea id="lost-reason" rows={2} {...form.register("reason")} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>{t("common.cancel")}</Button>
            <Button type="submit" disabled={lostMutation.isPending}>{lostMutation.isPending ? t("common.saving") : t("common.save")}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
