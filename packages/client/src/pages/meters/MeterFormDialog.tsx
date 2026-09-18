import { useEffect, useRef, useState, type FormEvent } from "react"
import { useForm, useWatch } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useTranslation } from "react-i18next"
import type { TFunction } from "i18next"
import { requiredString } from "@/lib/validation"
import { getApiErrorMessage } from "@/lib/api"
import type { Meter } from "@/lib/types"
import { googleMapsUrl } from "@/lib/utils"
import { useAddMeter, useEditMeter } from "@/hooks/meters"
import { useMembersSelect } from "@/hooks/members"
import { useActiveShares } from "@/hooks/shares"
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
import { PAYMENT_METHODS } from "./constants"
import { useMeterTypes } from "@/hooks/meterTypes"

const meterFormSchema = (t: TFunction) =>
  z.object({
    code: requiredString(t),
    member_id: requiredString(t),
    address: requiredString(t),
    type_id: requiredString(t),
    latitude: z.string().optional(),
    longitude: z.string().optional(),
    share_amount: z.string().optional(),
    share_method: z.string().optional(),
    share_reference: z.string().optional(),
    share_notes: z.string().optional(),
  })

type MeterFormValues = z.infer<ReturnType<typeof meterFormSchema>>

const DEFAULT_METER_FORM: MeterFormValues = {
  code: "",
  member_id: "",
  address: "",
  type_id: "",
  latitude: "",
  longitude: "",
  share_amount: "",
  share_method: "",
  share_reference: "",
  share_notes: "",
}

interface MeterFormDialogProps {
  open: boolean
  editing: Meter | null
  onOpenChange: (open: boolean) => void
}

export default function MeterFormDialog({
  open,
  editing,
  onOpenChange,
}: MeterFormDialogProps) {
  const { t } = useTranslation()
  const meterForm = useForm<MeterFormValues>({
    resolver: zodResolver(meterFormSchema(t)),
    defaultValues: DEFAULT_METER_FORM,
  })

  const { data: members } = useMembersSelect()
  const { data: activeShares } = useActiveShares()
  const { data: meterTypes } = useMeterTypes()
  const addMutation = useAddMeter()
  const editMutation = useEditMeter()

  const watchTypeId = useWatch({ control: meterForm.control, name: "type_id" })
  const watchMemberId = useWatch({ control: meterForm.control, name: "member_id" })
  const watchLatitude = useWatch({ control: meterForm.control, name: "latitude" })
  const watchLongitude = useWatch({ control: meterForm.control, name: "longitude" })
  const watchShareMethod = useWatch({ control: meterForm.control, name: "share_method" })

  const [imageSrc, setImageSrc] = useState<string | null>(null)
  const [croppedBase64, setCroppedBase64] = useState<string | null>(null)
  const [cropDialogOpen, setCropDialogOpen] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const closeDialog = () => {
    setImageSrc(null)
    setCroppedBase64(null)
    setCropDialogOpen(false)
    onOpenChange(false)
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

  useEffect(() => {
    if (!open) return
    meterForm.reset(
      editing
        ? {
            code: editing.code,
            member_id: editing.member_id,
            address: editing.address,
            type_id: editing.type_id,
            latitude: editing.latitude ?? "",
            longitude: editing.longitude ?? "",
            share_amount: "",
            share_method: "",
            share_reference: "",
            share_notes: "",
          }
        : {
            ...DEFAULT_METER_FORM,
            share_amount: activeShares?.[0]?.amount ?? "",
          },
    )
  }, [open, editing, activeShares, meterForm])

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    meterForm.handleSubmit(async (values) => {
      const payload = {
        code: values.code,
        memberId: values.member_id,
        address: values.address,
        typeId: values.type_id,
        latitude: values.latitude ? parseFloat(values.latitude) : undefined,
        longitude: values.longitude ? parseFloat(values.longitude) : undefined,
        shareAmount: values.share_amount ? Number(values.share_amount) : undefined,
        sharePaymentMethod: values.share_method || undefined,
        shareReference: values.share_reference || undefined,
        shareNotes: values.share_notes || undefined,
        shareEvidenceBase64: croppedBase64 ?? undefined,
      }
      if (editing) {
        editMutation.mutate(
          { id: editing.id, ...payload },
          {
            onSuccess: () => {
              toast.success(t("meters.updated"))
              onOpenChange(false)
            },
            onError: (err) => toast.error(getApiErrorMessage(err)),
          },
        )
      } else {
        addMutation.mutate(payload, {
          onSuccess: () => {
            toast.success(t("meters.created"))
            onOpenChange(false)
          },
          onError: (err) => toast.error(getApiErrorMessage(err)),
        })
      }
    })()
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{editing ? t("meters.editTitle") : t("meters.newTitle")}</DialogTitle>
          <DialogDescription>
            {editing
              ? t("meters.editDescription")
              : t("meters.newDescription")}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="code">{t("meters.meterCode")}</Label>
              <Input
                id="code"
                {...meterForm.register("code")}
              />
              {meterForm.formState.errors.code && (
                <p className="text-sm text-destructive">{meterForm.formState.errors.code.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label>{t("meters.type")}</Label>
              <ComboboxSelect
                value={watchTypeId}
                onValueChange={(v) => meterForm.setValue("type_id", v)}
                placeholder={t("meters.selectType")}
                className="w-full"
                options={(meterTypes?.map((mt) => ({ label: mt.name, value: mt.id })) ?? [])}
              />
              {meterForm.formState.errors.type_id && (
                <p className="text-sm text-destructive">{meterForm.formState.errors.type_id.message}</p>
              )}
            </div>
          </div>
          <div className="space-y-2">
            <Label>{t("meters.member")}</Label>
            <ComboboxSelect
              value={watchMemberId}
              onValueChange={(v) => meterForm.setValue("member_id", v)}
              placeholder={t("meters.selectMember")}
              className="w-full"
              options={(members?.items.map((m) => ({ label: `${m.first_name} ${m.last_name} (${m.ci})`, value: m.id })) ?? [])}
            />
            {meterForm.formState.errors.member_id && (
              <p className="text-sm text-destructive">{meterForm.formState.errors.member_id.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="address">{t("meters.address")}</Label>
            <Input
              id="address"
              {...meterForm.register("address")}
            />
            {meterForm.formState.errors.address && (
              <p className="text-sm text-destructive">{meterForm.formState.errors.address.message}</p>
            )}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="latitude">{t("meters.latitude")}</Label>
              <Input
                id="latitude"
                type="number"
                step="any"
                {...meterForm.register("latitude")}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="longitude">{t("meters.longitude")}</Label>
              <Input
                id="longitude"
                type="number"
                step="any"
                {...meterForm.register("longitude")}
              />
            </div>
          </div>
          {watchLatitude && watchLongitude ? (
            <p className="text-xs text-muted-foreground">
              {t("meters.googleMapsLink")}:{" "}
              <a
                href={googleMapsUrl(watchLatitude, watchLongitude)}
                target="_blank"
                rel="noreferrer"
                className="text-primary underline underline-offset-4"
              >
                {googleMapsUrl(watchLatitude, watchLongitude)}
              </a>
            </p>
          ) : null}
          {!editing ? (
            <div className="rounded-md border p-4">
              <p className="mb-3 text-sm font-medium">
                {t("meters.sharePayment")}
              </p>
              <div className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="share-amount">{t("meters.amountBob")}</Label>
                    <Input
                      id="share-amount"
                      type="number"
                      min="0"
                      step="0.01"
                      {...meterForm.register("share_amount")}
                      placeholder={
                        activeShares?.[0]
                          ? t("meters.default", { amount: activeShares[0].amount })
                          : t("meters.noActiveShare")
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>{t("meters.paymentMethod")}</Label>
                    <ComboboxSelect
                      value={watchShareMethod}
                      onValueChange={(v) => meterForm.setValue("share_method", v)}
                      placeholder={t("meters.selectMethod")}
                      className="w-full"
                      options={PAYMENT_METHODS.map((m) => ({ label: t(m.label), value: m.value }))}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="share-reference">{t("meters.reference")}</Label>
                  <Input
                    id="share-reference"
                    {...meterForm.register("share_reference")}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="share-notes">{t("meters.notes")}</Label>
                  <Input
                    id="share-notes"
                    {...meterForm.register("share_notes")}
                  />
                </div>
                <div className="space-y-2">
                  <Label>{t("meters.evidence")}</Label>
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
                        {t("meters.imageRetake")}
                      </Button>
                      <Button type="button" variant="outline" size="sm" onClick={() => { setCroppedBase64(null); setImageSrc(null) }}>
                        {t("meters.imageRemove")}
                      </Button>
                    </div>
                  ) : (
                    <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()}>
                      {t("meters.evidence")}
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ) : null}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={closeDialog}
            >
              {t("common.cancel")}
            </Button>
            <Button type="submit" disabled={addMutation.isPending || editMutation.isPending}>
              {(addMutation.isPending || editMutation.isPending) ? t("common.saving") : t("common.save")}
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
