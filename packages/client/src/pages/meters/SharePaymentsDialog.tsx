import { useEffect, useRef, useState, type FormEvent } from "react"
import { useForm, useWatch } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useTranslation } from "react-i18next"
import type { TFunction } from "i18next"
import { requiredString } from "@/lib/validation"
import { getApiErrorMessage } from "@/lib/api"
import { formatCurrency, formatDate } from "@/lib/utils"
import type { Meter } from "@/lib/types"
import { useAuth } from "@/lib/auth"
import { useMeterSharePayments, useAddSharePayment } from "@/hooks/meters"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { ComboboxSelect } from "@/components/ui/combobox"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
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
import { SHARE_STATUS_LABEL, PAYMENT_METHODS } from "./constants"
import { shareStatusOf } from "./helpers"

const sharePaymentFormSchema = (t: TFunction) =>
  z.object({
    amount: requiredString(t),
    method: z.string().optional(),
    reference: z.string().optional(),
    notes: z.string().optional(),
  })

type SharePaymentFormValues = z.infer<ReturnType<typeof sharePaymentFormSchema>>

const DEFAULT_SHARE_PAY_FORM: SharePaymentFormValues = {
  amount: "",
  method: "",
  reference: "",
  notes: "",
}

interface SharePaymentsDialogProps {
  meter: Meter | null
  onOpenChange: (open: boolean) => void
}

export default function SharePaymentsDialog({
  meter,
  onOpenChange,
}: SharePaymentsDialogProps) {
  const { t } = useTranslation()
  const { hasPermission } = useAuth()
  const canManage = hasPermission("meters.sharePayments")

  const sharePayForm = useForm<SharePaymentFormValues>({
    resolver: zodResolver(sharePaymentFormSchema(t)),
    defaultValues: DEFAULT_SHARE_PAY_FORM,
  })

  const watchSharePayMethod = useWatch({ control: sharePayForm.control, name: "method" })

  const [imageSrc, setImageSrc] = useState<string | null>(null)
  const [croppedBase64, setCroppedBase64] = useState<string | null>(null)
  const [cropDialogOpen, setCropDialogOpen] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const { data: sharePayments } = useMeterSharePayments(meter?.id, !!meter)
  const addSharePayment = useAddSharePayment(meter?.id ?? "")

  useEffect(() => {
    if (meter) sharePayForm.reset(DEFAULT_SHARE_PAY_FORM)
  }, [meter, sharePayForm])

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

  function handleSharePaySubmit(e: FormEvent) {
    e.preventDefault()
    sharePayForm.handleSubmit(async (values) => {
      addSharePayment.mutate(
        {
          amount: Number(values.amount),
          paymentMethod: values.method || undefined,
          reference: values.reference || undefined,
          notes: values.notes || undefined,
          evidenceBase64: croppedBase64 ?? undefined,
        },
        {
          onSuccess: () => {
            toast.success(t("meters.sharePaymentAdded"))
            sharePayForm.reset(DEFAULT_SHARE_PAY_FORM)
            setImageSrc(null)
            setCroppedBase64(null)
            setCropDialogOpen(false)
          },
          onError: (err) => toast.error(getApiErrorMessage(err)),
        },
      )
    })()
  }

  return (
    <Dialog
      open={!!meter}
      onOpenChange={(open) => !open && onOpenChange(false)}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("meters.sharePaymentsTitle")}</DialogTitle>
          <DialogDescription>
            {t("meters.sharePaymentsDescription", { code: meter?.code })}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex flex-wrap gap-4">
            <div>
              <p className="text-xs text-muted-foreground">{t("meters.paid")}</p>
              <p className="font-semibold">
                {formatCurrency(meter?.sharePaid ?? 0)}
              </p>
            </div>
            {meter?.shareTotal ? (
              <div>
                <p className="text-xs text-muted-foreground">{t("meters.cost")}</p>
                <p className="font-semibold">
                  {formatCurrency(meter.shareTotal)}
                </p>
              </div>
            ) : null}
            <div>
              <p className="text-xs text-muted-foreground">{t("meters.status")}</p>
              <Badge
                variant={
                  meter
                    ? shareStatusOf(meter) === "paid"
                      ? "default"
                      : shareStatusOf(meter) === "partial"
                        ? "secondary"
                        : "outline"
                    : "outline"
                }
              >
                {meter ? t(SHARE_STATUS_LABEL[shareStatusOf(meter)]) : "—"}
              </Badge>
            </div>
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>{t("meters.date")}</TableHead>
                  <TableHead className="text-right">{t("meters.amount")}</TableHead>
                  <TableHead>{t("meters.method")}</TableHead>
                  <TableHead>{t("meters.reference")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {!sharePayments?.length ? (
                  <TableRow>
                    <TableCell colSpan={4} className="h-16 text-center text-muted-foreground">
                      {t("meters.noPayments")}
                    </TableCell>
                  </TableRow>
                ) : (
                  sharePayments.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="text-sm">
                        {formatDate(p.paid_at)}
                      </TableCell>
                      <TableCell className="text-right font-medium tabular-nums">
                        {formatCurrency(p.amount)}
                      </TableCell>
                      <TableCell className="text-sm capitalize">
                        {p.payment_method ? t(`common.method.${p.payment_method}`) : "—"}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {p.reference ?? "—"}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {canManage ? (
            <form onSubmit={handleSharePaySubmit} noValidate className="space-y-3 rounded-md border p-4">
              <p className="text-sm font-medium">{t("meters.addPayment")}</p>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="sp-amount">{t("meters.amountBob")}</Label>
                  <Input
                    id="sp-amount"
                    type="number"
                    min="0"
                    step="0.01"
                    {...sharePayForm.register("amount")}
                  />
                  {sharePayForm.formState.errors.amount && (
                    <p className="text-sm text-destructive">{sharePayForm.formState.errors.amount.message}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>{t("meters.paymentMethod")}</Label>
                  <ComboboxSelect
                    value={watchSharePayMethod}
                    onValueChange={(v) => sharePayForm.setValue("method", v)}
                    placeholder={t("meters.selectMethod")}
                    className="w-full"
                    options={PAYMENT_METHODS.map((m) => ({ label: t(m.label), value: m.value }))}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="sp-reference">{t("meters.reference")}</Label>
                <Input
                  id="sp-reference"
                  {...sharePayForm.register("reference")}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sp-notes">{t("meters.notes")}</Label>
                <Input
                  id="sp-notes"
                  {...sharePayForm.register("notes")}
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
              <Button
                type="submit"
                className="w-full"
                disabled={addSharePayment.isPending}
              >
                {addSharePayment.isPending ? t("common.saving") : t("meters.addPayment")}
              </Button>
            </form>
          ) : null}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("common.close")}
          </Button>
        </DialogFooter>
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
