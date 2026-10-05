import { useEffect, type FormEvent } from "react"
import { useForm, Controller } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useTranslation } from "react-i18next"
import type { TFunction } from "i18next"
import { getApiErrorMessage } from "@/lib/api"
import type { Asset } from "@/lib/types"
import { useReturnAsset, useAssetLocations } from "@/hooks/assets"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { DatePicker } from "@/components/ui/date-picker"
import { ComboboxSelect } from "@/components/ui/combobox"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { toast } from "sonner"

const schema = (t: TFunction) => z.object({
  returnLocationId: z.string().optional(),
  returnedAt: z.string().optional(),
  notes: z.string().optional(),
})
type Values = z.infer<ReturnType<typeof schema>>
const DEFAULT: Values = { returnLocationId: "", returnedAt: "", notes: "" }

interface Props { asset: Asset | null; open: boolean; onOpenChange: (open: boolean) => void }

export default function AssetReturnDialog({ asset, open, onOpenChange }: Props) {
  const { t } = useTranslation()
  const form = useForm<Values>({ resolver: zodResolver(schema(t)), defaultValues: DEFAULT })
  const { data: locations } = useAssetLocations()
  const returnMutation = useReturnAsset()

  useEffect(() => { if (open) form.reset(DEFAULT) }, [open, form])

  function submit(e: FormEvent) {
    e.preventDefault()
    form.handleSubmit((values) => {
      if (!asset) return
      returnMutation.mutate(
        { id: asset.id, ...values },
        {
          onSuccess: () => { toast.success(t("assets.returned")); onOpenChange(false) },
          onError: (err) => toast.error(getApiErrorMessage(err)),
        },
      )
    })()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>{t("assets.returnTitle")}</DialogTitle><DialogDescription>{asset?.code}</DialogDescription></DialogHeader>
        <form onSubmit={submit} noValidate className="space-y-4">
          <div className="space-y-2">
            <Label>{t("assets.returnToLocation")}</Label>
            <Controller control={form.control} name="returnLocationId" render={({ field }) => (
              <ComboboxSelect value={field.value || ""} onValueChange={field.onChange}
                options={[{ label: t("common.none"), value: "" }, ...(locations ?? []).map((l) => ({ label: l.name, value: l.id }))]} placeholder={t("common.select")} />
            )} />
          </div>
          <div className="space-y-2">
            <Label>{t("assets.returnedAt")}</Label>
            <Controller control={form.control} name="returnedAt" render={({ field }) => (
              <DatePicker value={field.value ?? ""} onChange={field.onChange} />
            )} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="return-notes">{t("assets.notes")}</Label>
            <Textarea id="return-notes" rows={2} {...form.register("notes")} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>{t("common.cancel")}</Button>
            <Button type="submit" disabled={returnMutation.isPending}>{returnMutation.isPending ? t("common.saving") : t("common.save")}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
