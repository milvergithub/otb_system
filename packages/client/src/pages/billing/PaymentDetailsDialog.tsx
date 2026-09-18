import { useTranslation } from "react-i18next"
import { formatCurrency, monthNames } from "@/lib/utils"
import i18n, { toLocale } from "@/lib/i18n"
import type { Payment } from "@/lib/types"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Download, Eye } from "lucide-react"
import { useAuth } from "@/lib/auth"
import { STATUS_LABEL, STATUS_VARIANT, memberName, handleDownloadReceipt } from "./helpers"
import { viewReceipt } from "@/hooks/billing"

interface PaymentDetailsDialogProps {
  payment: Payment | null
  onOpenChange: (open: boolean) => void
}

export default function PaymentDetailsDialog({
  payment,
  onOpenChange,
}: PaymentDetailsDialogProps) {
  const { t } = useTranslation()
  const { hasPermission } = useAuth()
  const canDownload = hasPermission("billing.download")
  const months = monthNames()

  async function handleViewReceipt() {
    try {
      await viewReceipt(payment!.id)
    } catch (err) {
      console.error(err)
    }
  }

  return (
    <Dialog
      open={!!payment}
      onOpenChange={(open) => !open && onOpenChange(false)}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("billing.detailsTitle")}</DialogTitle>
        </DialogHeader>
        {payment ? (
          <div className="space-y-4">
            <div className="grid gap-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t("billing.member")}</span>
                <span className="font-medium">{memberName(payment)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t("billing.meter")}</span>
                <span className="font-mono">{payment.consumption?.meter?.code ?? "—"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t("billing.period")}</span>
                <span>
                  {payment.consumption
                    ? `${months[payment.consumption.month - 1]} ${payment.consumption.year}`
                    : "—"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t("billing.usage")}</span>
                <span>{payment.consumption?.cubic_meters ?? "—"} m³</span>
              </div>
              {payment.paymentDiscounts && payment.paymentDiscounts.length > 0 && parseFloat(payment.discount_amount) > 0 ? (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{t("billing.discounts")}</span>
                  <div className="text-right">
                    {payment.paymentDiscounts.map((pd) => (
                      <div key={pd.id} className="text-green-600 text-sm">
                        -{formatCurrency(pd.amount)} (
                        {pd.discount?.type === "fixed"
                          ? pd.discount?.name
                          : `${pd.discount?.value}% — ${pd.discount?.name}`})
                      </div>
                    ))}
                    <div className="text-green-600 font-semibold text-sm mt-1">
                      {t("billing.totalDiscounted", {
                        amount: formatCurrency(payment.discount_amount),
                      })}
                    </div>
                  </div>
                </div>
              ) : null}
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t("billing.total")}</span>
                <span className="font-semibold">
                  {formatCurrency(payment.total_amount)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t("billing.paid")}</span>
                <span>{formatCurrency(payment.amount_paid)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t("billing.status")}</span>
                <Badge variant={STATUS_VARIANT[payment.status]}>
                  {t(STATUS_LABEL[payment.status])}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">{t("billing.dueDate")}</span>
                <span>{payment.due_date}</span>
              </div>
            </div>
            {payment.history?.length ? (
              <div>
                <p className="mb-2 text-sm font-semibold">{t("billing.paymentHistory")}</p>
                <div className="space-y-2">
                  {payment.history.map((h) => (
                    <div
                      key={h.id}
                      className="flex items-center justify-between rounded-md border p-2 text-sm"
                    >
                      <div>
                        <span className="font-medium">
                          {formatCurrency(h.amount)}
                        </span>
                        <span className="ml-2 capitalize text-muted-foreground">
                          {h.payment_method ?? "—"}
                        </span>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {new Date(h.created_at).toLocaleString(toLocale(i18n.language))}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
            {canDownload ? (
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={handleViewReceipt}
                >
                  <Eye className="mr-2 size-4" />
                  {t("billing.viewReceipt")}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => handleDownloadReceipt(payment)}
                >
                  <Download className="mr-2 size-4" />
                  {t("billing.downloadReceipt")}
                </Button>
              </DialogFooter>
            ) : null}
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}
