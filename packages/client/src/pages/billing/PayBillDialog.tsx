import { useRef, useState, useEffect, useMemo, useCallback, type FormEvent } from "react"
import { useForm, useWatch } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useTranslation } from "react-i18next"
import type { TFunction } from "i18next"
import { requiredString } from "@/lib/validation"
import { getApiErrorMessage } from "@/lib/api"
import { formatCurrency, monthNames } from "@/lib/utils"
import type { Payment } from "@/lib/types"
import { useActiveDiscounts, usePayBill } from "@/hooks/billing"
import { useSearchUsers } from "@/hooks/users"
import { useAuth } from "@/lib/auth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
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
import { Banknote, SwitchCamera, Trash } from "lucide-react"
import ImageCropDialog from "@/components/ImageCropDialog"
import { PAYMENT_METHODS, memberName, remaining } from "./helpers"

const payFormSchema = (t: TFunction) =>
  z.object({
    amount: requiredString(t),
    method: requiredString(t),
    reference: z.string().optional(),
    discount_ids: z.array(z.string()).optional(),
    collectorUserId: z.string().optional(),
  })

type PayFormValues = z.infer<ReturnType<typeof payFormSchema>>

const DEFAULT_PAY_FORM: PayFormValues = {
  amount: "",
  method: "cash",
  reference: "",
  discount_ids: [],
  collectorUserId: "",
}

interface PayBillDialogProps {
  payment: Payment | null
  onOpenChange: (open: boolean) => void
}

export default function PayBillDialog({
  payment,
  onOpenChange,
}: PayBillDialogProps) {
  const { t } = useTranslation()
  const months = monthNames()
  const form = useForm<PayFormValues>({
    resolver: zodResolver(payFormSchema(t)),
    defaultValues: DEFAULT_PAY_FORM,
  })

  const watchMethod = useWatch({ control: form.control, name: "method" })
  const watchCollector = useWatch({ control: form.control, name: "collectorUserId" })
  const watchDiscountIds = useWatch({
    control: form.control,
    name: "discount_ids",
  })

  const { data: discounts } = useActiveDiscounts()
  const payMutation = usePayBill()
  const { hasPermission } = useAuth()
  const canPickCollector = hasPermission("users.read")
  const { data: users } = useSearchUsers(undefined, canPickCollector)

  const [imageSrc, setImageSrc] = useState<string | null>(null)
  const [croppedBase64, setCroppedBase64] = useState<string | null>(null)
  const [cropDialogOpen, setCropDialogOpen] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const originalAmount = useMemo(() => {
    if (!payment) return 0
    return parseFloat(payment.total_amount) + parseFloat(payment.discount_amount)
  }, [payment])

  const recalcAmount = useCallback((discountIds: string[] | undefined): number => {
    const amountPaid = payment ? parseFloat(payment.amount_paid ?? "0") : 0
    if (!discountIds || discountIds.length === 0) return Math.max(0, originalAmount - amountPaid)
    if (!discounts) return Math.max(0, originalAmount - amountPaid)
    let totalDiscount = 0
    for (const id of discountIds) {
      const d = discounts.find((x) => x.id === id)
      if (!d) {
        const stored = payment?.paymentDiscounts?.find((pd) => pd.discount_id === id)
        if (stored) totalDiscount += parseFloat(stored.amount)
        continue
      }
      if (d.type === "fixed") {
        totalDiscount += parseFloat(d.value)
      } else {
        totalDiscount += originalAmount * (parseFloat(d.value) / 100)
      }
    }
    return Math.max(0, originalAmount - totalDiscount - amountPaid)
  }, [originalAmount, discounts, payment])

  const discountedAmount = useMemo(() => recalcAmount(watchDiscountIds), [watchDiscountIds, recalcAmount])

  useEffect(() => {
    if (!payment) return
    form.reset({
      amount: remaining(payment).toFixed(2),
      method: "cash",
      reference: "",
      discount_ids: payment.paymentDiscounts?.map((pd) => pd.discount_id) ?? [],
      collectorUserId: "",
    })
  }, [payment, form])

  useEffect(() => {
    if (!payment) return
    form.setValue("amount", discountedAmount.toFixed(2))
  }, [discountedAmount, payment, form])

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

  function toggleDiscount(discountId: string) {
    const current = watchDiscountIds ?? []
    form.setValue(
      "discount_ids",
      current.includes(discountId)
        ? current.filter((id) => id !== discountId)
        : [...current, discountId],
    )
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    form.handleSubmit((values) => {
      payMutation.mutate(
        {
          id: payment!.id,
          amount: Number(values.amount),
          paymentMethod: values.method,
          reference: values.reference || undefined,
          discountIds: values.discount_ids ?? [],
          evidenceBase64: croppedBase64 ?? undefined,
          collectorUserId: values.collectorUserId || undefined,
        },
        {
          onSuccess: () => {
            toast.success(t("billing.paymentRecorded"))
            closeDialog()
          },
          onError: (err) => toast.error(getApiErrorMessage(err)),
        },
      )
    })()
  }

  return (
    <Dialog
      open={!!payment}
      onOpenChange={(open) => !open && closeDialog()}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("billing.recordTitle")}</DialogTitle>
          <DialogDescription>
            {payment && payment.consumption
              ? t("billing.billFor", {
                  member: memberName(payment),
                  period: `${months[payment.consumption.month - 1]} ${payment.consumption.year}`,
                })
              : ""}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="amount">{t("billing.amountBob")}</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0.01"
                {...form.register("amount")}
              />
              {form.formState.errors.amount && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.amount.message}
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label>{t("billing.paymentMethod")}</Label>
              <ComboboxSelect
                value={watchMethod}
                onValueChange={(v) => form.setValue("method", v)}
                className="w-full"
                options={PAYMENT_METHODS.map((m) => ({ label: t(m.label), value: m.value }))}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="reference">{t("billing.reference")}</Label>
            <Input
              id="reference"
              {...form.register("reference")}
            />
          </div>
          {canPickCollector ? (
            <div className="space-y-2">
              <Label>{t("finances.collector")}</Label>
              <ComboboxSelect
                value={watchCollector || ""}
                onValueChange={(v) => form.setValue("collectorUserId", v)}
                className="w-full"
                options={[
                  { label: t("finances.collectorAuto"), value: "" },
                  ...(users ?? []).map((u) => ({ label: u.full_name, value: u.id })),
                ]}
                placeholder={t("common.select")}
                searchPlaceholder={t("common.search")}
              />
            </div>
          ) : null}
          <div className="space-y-2">
            <Label>{t("billing.discountsOptional")}</Label>
            <div className="rounded-md border p-3 space-y-2 max-h-40 overflow-y-auto">
              {discounts?.length ? (
                discounts.map((d) => (
                  <label
                    key={d.id}
                    className="flex items-center gap-2 cursor-pointer"
                  >
                    <Checkbox
                      checked={(watchDiscountIds ?? []).includes(d.id)}
                      onCheckedChange={() => toggleDiscount(d.id)}
                    />
                    <span className="text-sm">
                      {d.name} —{" "}
                      {d.type === "fixed"
                        ? formatCurrency(d.value)
                        : `${d.value}%`}
                    </span>
                  </label>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">
                  {t("common.noDiscounts")}
                </p>
              )}
            </div>
          </div>
          <div className="space-y-2">
            <Label>{t("billing.evidence")}</Label>
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
                  <SwitchCamera />
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={() => { setCroppedBase64(null); setImageSrc(null) }}>
                  <Trash />
                </Button>
              </div>
            ) : (
              <Button type="button" variant="outline" onClick={() => fileInputRef.current?.click()}>
                {t("billing.evidence")}
              </Button>
            )}
          </div>
          {payment ? (
            <p className="text-sm text-muted-foreground">
              <Banknote className="mr-1 inline size-4" />
              {t("billing.remainingBalance")}{" "}
              <span className="font-medium text-foreground">
                {formatCurrency(discountedAmount.toFixed(2))}
              </span>
            </p>
          ) : null}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={closeDialog}
            >
              {t("common.cancel")}
            </Button>
            <Button type="submit" disabled={payMutation.isPending}>
              {payMutation.isPending
                ? t("billing.recording")
                : t("billing.recordPayment")}
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
