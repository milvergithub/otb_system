import { useEffect, useState, type FormEvent } from "react"
import { useForm, Controller } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useTranslation } from "react-i18next"
import type { TFunction } from "i18next"
import { requiredString } from "@/lib/validation"
import { getApiErrorMessage } from "@/lib/api"
import type { Asset } from "@/lib/types"
import { useLoanAsset, useAssetLocations } from "@/hooks/assets"
import { useAllMembers } from "@/hooks/members"
import { useSearchUsers } from "@/hooks/users"
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
  toLocationId: z.string().optional(),
  responsibleUserId: z.string().optional(),
  responsibleMemberId: z.string().optional(),
  motive: requiredString(t),
  movedAt: z.string().optional(),
  notes: z.string().optional(),
}).refine((v) => v.responsibleUserId || v.responsibleMemberId, { message: t("assets.responsibleRequired"), path: ["responsibleUserId"] })

type Values = z.infer<ReturnType<typeof schema>>

const DEFAULT: Values = { toLocationId: "", responsibleUserId: "", responsibleMemberId: "", motive: "", movedAt: "", notes: "" }

interface Props {
  asset: Asset | null
  open: boolean
  onOpenChange: (open: boolean) => void
}

export default function AssetLoanDialog({ asset, open, onOpenChange }: Props) {
  const { t } = useTranslation()
  const form = useForm<Values>({ resolver: zodResolver(schema(t)), defaultValues: DEFAULT })
  const { data: locations } = useAssetLocations()
  const { data: members } = useAllMembers()
  const { data: users } = useSearchUsers()
  const loanMutation = useLoanAsset()

  useEffect(() => { if (open) form.reset(DEFAULT) }, [open, form])

  function submit(e: FormEvent) {
    e.preventDefault()
    form.handleSubmit((values) => {
      if (!asset) return
      loanMutation.mutate(
        { id: asset.id, ...values },
        {
          onSuccess: () => { toast.success(t("assets.loanCreated")); onOpenChange(false) },
          onError: (err) => toast.error(getApiErrorMessage(err)),
        },
      )
    })()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("assets.loanTitle")}</DialogTitle>
          <DialogDescription>{asset?.code}</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} noValidate className="space-y-4">
          <div className="space-y-2">
            <Label>{t("assets.toLocation")}</Label>
            <Controller control={form.control} name="toLocationId" render={({ field }) => (
              <ComboboxSelect value={field.value || ""} onValueChange={field.onChange}
                options={[{ label: t("common.none"), value: "" }, ...(locations ?? []).map((l) => ({ label: l.name, value: l.id }))]} placeholder={t("common.select")} />
            )} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>{t("assets.responsibleUser")}</Label>
              <Controller control={form.control} name="responsibleUserId" render={({ field }) => (
                <ComboboxSelect value={field.value || ""} onValueChange={field.onChange}
                  options={[{ label: t("common.none"), value: "" }, ...(users ?? []).map((u) => ({ label: u.full_name, value: u.id }))]} placeholder={t("common.select")} />
              )} />
              {form.formState.errors.responsibleUserId && <p className="text-sm text-destructive">{form.formState.errors.responsibleUserId.message}</p>}
            </div>
            <div className="space-y-2">
              <Label>{t("assets.responsibleMember")}</Label>
              <Controller control={form.control} name="responsibleMemberId" render={({ field }) => (
                <ComboboxSelect value={field.value || ""} onValueChange={field.onChange}
                  options={[{ label: t("common.none"), value: "" }, ...(members ?? []).map((m) => ({ label: `${m.first_name} ${m.last_name}`, value: m.id }))]} placeholder={t("common.select")} />
              )} />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="loan-motive">{t("assets.motive")}</Label>
            <Input id="loan-motive" {...form.register("motive")} />
          </div>
          <div className="space-y-2">
            <Label>{t("assets.movedAt")}</Label>
            <Controller control={form.control} name="movedAt" render={({ field }) => (
              <DatePicker value={field.value ?? ""} onChange={field.onChange} />
            )} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="loan-notes">{t("assets.notes")}</Label>
            <Textarea id="loan-notes" rows={2} {...form.register("notes")} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>{t("common.cancel")}</Button>
            <Button type="submit" disabled={loanMutation.isPending}>{loanMutation.isPending ? t("common.saving") : t("common.save")}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
