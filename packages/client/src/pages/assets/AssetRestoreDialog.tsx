import { useEffect, type FormEvent } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useTranslation } from "react-i18next"
import { getApiErrorMessage } from "@/lib/api"
import type { Asset } from "@/lib/types"
import { useRestoreAsset } from "@/hooks/assets"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import { toast } from "sonner"

const schema = () => z.object({ notes: z.string().optional() })
type Values = z.infer<ReturnType<typeof schema>>
const DEFAULT: Values = { notes: "" }

interface Props { asset: Asset | null; open: boolean; onOpenChange: (open: boolean) => void }

export default function AssetRestoreDialog({ asset, open, onOpenChange }: Props) {
  const { t } = useTranslation()
  const form = useForm<Values>({ resolver: zodResolver(schema()), defaultValues: DEFAULT })
  const restoreMutation = useRestoreAsset()

  useEffect(() => { if (open) form.reset(DEFAULT) }, [open, form])

  function submit(e: FormEvent) {
    e.preventDefault()
    form.handleSubmit((values) => {
      if (!asset) return
      restoreMutation.mutate(
        { id: asset.id, notes: values.notes || undefined },
        {
          onSuccess: () => { toast.success(t("assets.restored")); onOpenChange(false) },
          onError: (err) => toast.error(getApiErrorMessage(err)),
        },
      )
    })()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("assets.restoreTitle")}</DialogTitle>
          <DialogDescription>{asset?.code}</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} noValidate className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="restore-notes">{t("assets.notes")}</Label>
            <Textarea id="restore-notes" rows={2} {...form.register("notes")} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>{t("common.cancel")}</Button>
            <Button type="submit" disabled={restoreMutation.isPending}>{restoreMutation.isPending ? t("common.saving") : t("common.save")}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
