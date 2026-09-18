import { useRef, useState, type FormEvent } from "react"
import { useForm, useWatch } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useTranslation } from "react-i18next"
import type { TFunction } from "i18next"
import { requiredString } from "@/lib/validation"
import { getApiErrorMessage } from "@/lib/api"
import { monthNames } from "@/lib/utils"
import { useAddConsumption } from "@/hooks/consumptions"
import { useMetersSelect } from "@/hooks/meters"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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
import ImageCropDialog from "@/components/ImageCropDialog"
import ImageCropper from "@/components/ImageCropper"

const CURRENT_YEAR = new Date().getFullYear()
const CURRENT_MONTH = new Date().getMonth() + 1

const consumptionFormSchema = (t: TFunction) =>
  z.object({
    meter_id: requiredString(t),
    month: requiredString(t),
    year: requiredString(t),
    current_reading: requiredString(t),
    imageBase64: z.string().optional(),
  })

type ConsumptionFormValues = z.infer<ReturnType<typeof consumptionFormSchema>>

const DEFAULT_FORM: ConsumptionFormValues = {
  meter_id: "",
  month: String(CURRENT_MONTH),
  year: String(CURRENT_YEAR),
  current_reading: "",
}

interface RecordConsumptionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export default function RecordConsumptionDialog({
  open,
  onOpenChange,
}: RecordConsumptionDialogProps) {
  const { t } = useTranslation()
  const months = monthNames()
  const form = useForm<ConsumptionFormValues>({
    resolver: zodResolver(consumptionFormSchema(t)),
    defaultValues: DEFAULT_FORM,
  })

  const watchMeterId = useWatch({ control: form.control, name: "meter_id" })
  const watchMonth = useWatch({ control: form.control, name: "month" })

  const { data: meters } = useMetersSelect()
  const addConsumption = useAddConsumption()
  const [imageSrc, setImageSrc] = useState<string | null>(null)
  const [croppedBase64, setCroppedBase64] = useState<string | null>(null)
  const [cropDialogOpen, setCropDialogOpen] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleOpenChange = (nextOpen: boolean) => {
    if (nextOpen) {
      form.reset(DEFAULT_FORM)
      setImageSrc(null)
      setCroppedBase64(null)
      setCropDialogOpen(false)
    }
    onOpenChange(nextOpen)
  }

  const meterLabel = (id: string) => {
    const m = meters?.items.find((x) => x.id === id)
    if (!m) return id.slice(0, 8)
    const member = m.member
    return `${m.code}${member ? ` · ${member.first_name} ${member.last_name}` : ""}`
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (ev) => {
        setImageSrc(ev.target?.result as string)
        setCroppedBase64(null)
        setCropDialogOpen(true)
      }
      reader.readAsDataURL(file)
    }
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    form.handleSubmit((values) => {
      addConsumption.mutate(
        {
          meterId: values.meter_id,
          month: Number(values.month),
          year: Number(values.year),
          currentReading: Number(values.current_reading),
          imageBase64: croppedBase64 ?? undefined,
        },
        {
          onSuccess: () => {
            toast.success(t("consumption.recorded"))
            onOpenChange(false)
          },
          onError: (err) => toast.error(getApiErrorMessage(err)),
        },
      )
    })()
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("consumption.recordTitle")}</DialogTitle>
          <DialogDescription>
            {t("consumption.recordDesc")}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          <div className="space-y-2">
            <Label>{t("consumption.meter")}</Label>
            <ComboboxSelect
              value={watchMeterId}
              onValueChange={(v) => form.setValue("meter_id", v)}
              placeholder={t("consumption.selectMeter")}
              className="w-full"
              options={(meters?.items.map((m) => ({ label: meterLabel(m.id), value: m.id })) ?? [])}
            />
            {form.formState.errors.meter_id && (
              <p className="text-sm text-destructive">
                {form.formState.errors.meter_id.message}
              </p>
            )}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>{t("consumption.month")}</Label>
              <ComboboxSelect
                value={watchMonth}
                onValueChange={(v) => form.setValue("month", v)}
                className="w-full"
                options={months.map((m, i) => ({ label: m, value: String(i + 1) }))}
              />
              {form.formState.errors.month && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.month.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="year">{t("consumption.year")}</Label>
              <Input
                id="year"
                type="number"
                {...form.register("year")}
              />
              {form.formState.errors.year && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.year.message}
                </p>
              )}
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="current_reading">{t("consumption.currentReading")}</Label>
            <Input
              id="current_reading"
              type="number"
              step="0.01"
              min="0"
              {...form.register("current_reading")}
            />
            {form.formState.errors.current_reading && (
              <p className="text-sm text-destructive">
                {form.formState.errors.current_reading.message}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label>{t("consumption.evidence")}</Label>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              ref={fileInputRef}
              onChange={handleFileChange}
            />
            {croppedBase64 ? (
              <div className="flex items-center gap-3">
                <img src={croppedBase64} alt="Preview" className="h-20 rounded object-cover" />
                <Button type="button" variant="outline" size="sm" onClick={() => { setCroppedBase64(null); fileInputRef.current?.click() }}>
                  {t("consumption.imageRetake")}
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={() => { setCroppedBase64(null); setImageSrc(null) }}>
                  {t("consumption.imageRemove")}
                </Button>
              </div>
            ) : (
              <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()}>
                {t("consumption.evidence")}
              </Button>
            )}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
            >
              {t("common.cancel")}
            </Button>
            <Button type="submit" disabled={addConsumption.isPending}>
              {addConsumption.isPending ? t("common.saving") : t("common.save")}
            </Button>
          </DialogFooter>
        </form>
        <ImageCropDialog
          open={cropDialogOpen}
          onOpenChange={setCropDialogOpen}
          src={imageSrc ?? ""}
          onConfirm={(base64) => { setCroppedBase64(base64); setCropDialogOpen(false) }}
        />
      </DialogContent>
    </Dialog>
  )
}
