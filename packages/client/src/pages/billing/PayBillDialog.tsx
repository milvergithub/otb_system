import { useRef, useState, useEffect, useMemo, useCallback, type FormEvent } from "react"
import { useForm, useWatch } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useTranslation } from "react-i18next"
import type { TFunction } from "i18next"
import { requiredString } from "@/lib/validation"
import { getApiErrorMessage } from "@/lib/api"
import { formatCurrency, monthNames } from "@/lib/utils"
import {
  defaultSurchargeSelection,
  resolveLateFeePreview,
  surchargeAmount,
} from "@/lib/utils/lateFee"
import type { Payment } from "@/lib/types"
import {
  useActiveDiscounts,
  useActiveSurcharges,
  useMeterBills,
  usePayBill,
} from "@/hooks/billing"
import { useSettings } from "@/hooks/settings"
import { useSearchUsers } from "@/hooks/users"
import { useAuth } from "@/lib/auth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import SurchargeSelectList from "@/components/SurchargeSelectList"
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
import { memberName, remaining } from "./helpers"
import { usePaymentMethods } from "@/hooks/paymentMethods"

const payFormSchema = (t: TFunction) =>
  z.object({
    amount: requiredString(t),
    method: requiredString(t),
    reference: z.string().optional(),
    discount_ids: z.array(z.string()).optional(),
    surcharge_ids: z.array(z.string()).optional(),
    collectorUserId: z.string().optional(),
  })

type PayFormValues = z.infer<ReturnType<typeof payFormSchema>>

const DEFAULT_PAY_FORM: PayFormValues = {
  amount: "",
  method: "",
  reference: "",
  discount_ids: [],
  surcharge_ids: [],
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
  const watchSurchargeIds = useWatch({
    control: form.control,
    name: "surcharge_ids",
  })

  const { data: discounts } = useActiveDiscounts()
  const { data: surcharges } = useActiveSurcharges(!!payment)
  const { data: settings } = useSettings()
  const minMonths = parseInt(settings?.late_fee_min_months ?? "", 10) || 3
  const { data: meterBills } = useMeterBills(
    payment?.consumption?.meter_id,
    !!payment,
  )
  const payMutation = usePayBill()
  const { hasPermission } = useAuth()
  const canPickCollector = hasPermission("users.read")
  const { data: users } = useSearchUsers(undefined, canPickCollector)
  const { data: paymentMethods } = usePaymentMethods(
    hasPermission("payment_methods.read"),
  )

  const [imageSrc, setImageSrc] = useState<string | null>(null)
  const [croppedBase64, setCroppedBase64] = useState<string | null>(null)
  const [cropDialogOpen, setCropDialogOpen] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const originalAmount = useMemo(() => {
    if (!payment) return 0
    return parseFloat(payment.total_amount) + parseFloat(payment.discount_amount)
  }, [payment])

  // Surcharges snapshotted at generation time are read-only: the bill can no
  // longer gain fees. A bill without them may still receive the selection
  // while the meter qualifies, mirroring the backend's eligibility check
  // (this payment is excluded from the overdue count, as `excludeId` does).
  const hasPersistedSurcharges = (payment?.paymentSurcharges?.length ?? 0) > 0
  const lateFee = useMemo(() => {
    if (!payment) return null
    return resolveLateFeePreview({
      bills: (meterBills?.items ?? []).filter(
        (bill) => bill.id !== payment.id,
      ),
      meterId: payment.consumption?.meter_id ?? "",
      enabled: settings?.late_fee_enabled === "true",
      minMonths,
      surcharges,
      baseAmount: originalAmount,
      selectedSurchargeIds: watchSurchargeIds ?? [],
    })
  }, [
    payment,
    meterBills,
    settings,
    minMonths,
    surcharges,
    originalAmount,
    watchSurchargeIds,
  ])
  const surchargeEditable =
    !!payment && !hasPersistedSurcharges && !!lateFee?.eligible

  const recalcAmount = useCallback(
    (discountIds: string[] | undefined, surchargeIds?: string[]): number => {
      const amountPaid = payment ? parseFloat(payment.amount_paid ?? "0") : 0
      let totalDiscount = 0
      if (discountIds && discountIds.length > 0 && discounts) {
        for (const id of discountIds) {
          const d = discounts.find((x) => x.id === id)
          if (!d) {
            const stored = payment?.paymentDiscounts?.find(
              (pd) => pd.discount_id === id,
            )
            if (stored) totalDiscount += parseFloat(stored.amount)
            continue
          }
          if (d.type === "fixed") {
            totalDiscount += parseFloat(d.value)
          } else {
            totalDiscount += originalAmount * (parseFloat(d.value) / 100)
          }
        }
      }
      let surchargeTotal = 0
      if (surchargeIds && surchargeIds.length > 0 && surcharges) {
        for (const id of surchargeIds) {
          const s = surcharges.find((x) => x.id === id)
          if (s) surchargeTotal += surchargeAmount(s, originalAmount) ?? 0
        }
      }
      return Math.max(
        0,
        originalAmount - totalDiscount + surchargeTotal - amountPaid,
      )
    },
    [originalAmount, discounts, surcharges, payment],
  )

  const discountedAmount = useMemo(
    () =>
      recalcAmount(
        watchDiscountIds,
        surchargeEditable ? watchSurchargeIds : undefined,
      ),
    [watchDiscountIds, surchargeEditable, watchSurchargeIds, recalcAmount],
  )

  useEffect(() => {
    if (!payment) return
    form.reset({
      amount: remaining(payment).toFixed(2),
      method: "cash",
      reference: "",
      discount_ids: payment.paymentDiscounts?.map((pd) => pd.discount_id) ?? [],
      surcharge_ids: [],
      collectorUserId: "",
    })
  }, [payment, form])

  // Preselect the default active surcharges once the eligibility data is
  // loaded; the ref keeps it once per payment so it never overrides toggles.
  const surchargeInitRef = useRef<string | null>(null)
  useEffect(() => {
    if (!payment) {
      surchargeInitRef.current = null
      return
    }
    if (surchargeInitRef.current === payment.id) return
    if (hasPersistedSurcharges) {
      surchargeInitRef.current = payment.id
      return
    }
    if (settings === undefined || surcharges === undefined) return
    if (payment.consumption?.meter_id && meterBills === undefined) return
    surchargeInitRef.current = payment.id
    form.setValue(
      "surcharge_ids",
      defaultSurchargeSelection({
        bills: (meterBills?.items ?? []).filter(
          (bill) => bill.id !== payment.id,
        ),
        meterId: payment.consumption?.meter_id ?? "",
        enabled: settings.late_fee_enabled === "true",
        minMonths,
        surcharges,
        baseAmount: originalAmount,
      }),
      { shouldDirty: false },
    )
  }, [
    payment,
    hasPersistedSurcharges,
    settings,
    surcharges,
    meterBills,
    minMonths,
    originalAmount,
    form,
  ])

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

  function toggleSurcharge(surchargeId: string) {
    const current = watchSurchargeIds ?? []
    form.setValue(
      "surcharge_ids",
      current.includes(surchargeId)
        ? current.filter((id) => id !== surchargeId)
        : [...current, surchargeId],
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
          surchargeIds: surchargeEditable ? (values.surcharge_ids ?? []) : undefined,
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
                placeholder={t("meters.selectMethod")}
                className="w-full"
                options={
                  paymentMethods?.map((m) => ({ label: m.name, value: m.code })) ?? []
                }
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
          {surchargeEditable ? (
            <div className="space-y-2">
              <Label>{t("billing.lateFee")}</Label>
              <SurchargeSelectList
                surcharges={surcharges ?? []}
                selectedIds={watchSurchargeIds ?? []}
                onToggle={toggleSurcharge}
                baseAmount={originalAmount}
                unknownAmountLabel={t("consumption.surchargeCalculated")}
              />
              {(lateFee?.total ?? 0) > 0 ? (
                <p className="text-sm text-destructive">
                  {t("billing.totalSurcharged", {
                    amount: formatCurrency(lateFee!.total),
                  })}
                </p>
              ) : null}
            </div>
          ) : hasPersistedSurcharges &&
            payment?.paymentSurcharges?.length ? (
            <div className="space-y-2">
              <Label>{t("billing.lateFee")}</Label>
              <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3 space-y-1">
                {payment.paymentSurcharges.map((ps) => (
                  <div
                    key={ps.id}
                    className="flex items-center justify-between gap-3 text-sm"
                  >
                    <span>
                      {ps.surcharge?.name ?? ps.surcharge_id} —{" "}
                      {ps.surcharge?.type === "fixed"
                        ? formatCurrency(ps.surcharge.value)
                        : `${ps.surcharge?.value}%`}
                    </span>
                    <span className="font-medium text-destructive">
                      +{formatCurrency(ps.amount)}
                    </span>
                  </div>
                ))}
                <div className="flex items-center justify-between gap-3 border-t pt-2 text-sm font-semibold text-destructive">
                  <span>{t("consumption.surchargeTotal")}</span>
                  <span>{`+${formatCurrency(payment.late_fee_amount)}`}</span>
                </div>
              </div>
            </div>
          ) : null}
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
