import { useEffect, type FormEvent } from "react"
import { useForm, Controller } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useTranslation } from "react-i18next"
import type { TFunction } from "i18next"
import { requiredString } from "@/lib/validation"
import { getApiErrorMessage } from "@/lib/api"
import { useAddAssetsBulk, useAssetCategories, useAssetLocations } from "@/hooks/assets"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { DatePicker } from "@/components/ui/date-picker"
import { ComboboxSelect } from "@/components/ui/combobox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { toast } from "sonner"

const schema = (t: TFunction) =>
  z.object({
    name: requiredString(t),
    count: z.string().min(1, { message: t("validation.required") }).refine((v) => parseInt(v) > 0, { message: t("validation.required") }),
    description: z.string().optional(),
    categoryId: z.string().optional(),
    locationId: z.string().optional(),
    condition: z.string().optional(),
    acquisitionDate: z.string().optional(),
    acquisitionValue: z.string().optional(),
    acquisitionType: z.string().optional(),
    notes: z.string().optional(),
  })

type Values = z.infer<ReturnType<typeof schema>>

const DEFAULT: Values = {
  name: "",
  count: "1",
  description: "",
  categoryId: "",
  locationId: "",
  condition: "good",
  acquisitionDate: "",
  acquisitionValue: "",
  acquisitionType: "",
  notes: "",
}

interface BulkAssetDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export default function BulkAssetDialog({ open, onOpenChange }: BulkAssetDialogProps) {
  const { t } = useTranslation()
  const form = useForm<Values>({ resolver: zodResolver(schema(t)), defaultValues: DEFAULT })
  const { data: categories } = useAssetCategories()
  const { data: locations } = useAssetLocations()
  const addBulk = useAddAssetsBulk()

  useEffect(() => {
    if (open) form.reset(DEFAULT)
  }, [open, form])

  function submit(e: FormEvent) {
    e.preventDefault()
    form.handleSubmit((values) => {
      addBulk.mutate(
        {
          name: values.name.trim(),
          count: parseInt(values.count),
          description: values.description || undefined,
          categoryId: values.categoryId || undefined,
          locationId: values.locationId || undefined,
          condition: values.condition || undefined,
          acquisitionDate: values.acquisitionDate || undefined,
          acquisitionValue: values.acquisitionValue ? Number(values.acquisitionValue) : undefined,
          acquisitionType: values.acquisitionType || undefined,
          notes: values.notes || undefined,
        },
        {
          onSuccess: () => {
            toast.success(t("assets.created"))
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
          <DialogTitle>{t("assets.bulkTitle")}</DialogTitle>
          <DialogDescription>{t("assets.bulkDesc")}</DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} noValidate className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="bulk-name">{t("assets.name")}</Label>
            <Input id="bulk-name" {...form.register("name")} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="bulk-count">{t("assets.quantity")}</Label>
            <Input id="bulk-count" type="number" min="1" {...form.register("count")} />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>{t("assets.category")}</Label>
              <Controller control={form.control} name="categoryId" render={({ field }) => (
                <ComboboxSelect value={field.value || ""} onValueChange={field.onChange}
                  options={[{ label: t("common.none"), value: "" }, ...(categories ?? []).map((c) => ({ label: c.name, value: c.id }))]} placeholder={t("common.select")} />
              )} />
            </div>
            <div className="space-y-2">
              <Label>{t("assets.location")}</Label>
              <Controller control={form.control} name="locationId" render={({ field }) => (
                <ComboboxSelect value={field.value || ""} onValueChange={field.onChange}
                  options={[{ label: t("common.none"), value: "" }, ...(locations ?? []).map((l) => ({ label: l.name, value: l.id }))]} placeholder={t("common.select")} />
              )} />
            </div>
          </div>

          <div className="space-y-2">
            <Label>{t("assets.conditionLabel")}</Label>
            <Controller control={form.control} name="condition" render={({ field }) => (
              <ComboboxSelect value={field.value || "good"} onValueChange={field.onChange}
                options={[
                  { label: t("assets.condition.new"), value: "new" },
                  { label: t("assets.condition.good"), value: "good" },
                  { label: t("assets.condition.fair"), value: "fair" },
                  { label: t("assets.condition.poor"), value: "poor" },
                ]} placeholder={t("common.select")} />
            )} />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>{t("assets.acquisitionDate")}</Label>
              <Controller control={form.control} name="acquisitionDate" render={({ field }) => (
                <DatePicker value={field.value ?? ""} onChange={field.onChange} />
              )} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bulk-value">{t("assets.acquisitionValue")}</Label>
              <Input id="bulk-value" type="number" step="0.01" min="0" {...form.register("acquisitionValue")} />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="bulk-notes">{t("assets.notes")}</Label>
            <Textarea id="bulk-notes" rows={2} {...form.register("notes")} />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>{t("common.cancel")}</Button>
            <Button type="submit" disabled={addBulk.isPending}>{addBulk.isPending ? t("common.saving") : t("common.save")}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
