import { useState } from "react"
import { useTranslation } from "react-i18next"
import { toast } from "sonner"
import { useVoidFinanceTransaction } from "@/hooks/finances"
import { getApiErrorMessage } from "@/lib/api"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import type { FinanceTransaction } from "@/lib/types"

interface VoidFinanceTransactionDialogProps {
  transaction: FinanceTransaction | null
  onOpenChange: (open: boolean) => void
}

export default function VoidFinanceTransactionDialog({ transaction, onOpenChange }: VoidFinanceTransactionDialogProps) {
  const { t } = useTranslation()
  const [reason, setReason] = useState("")
  const voidMutation = useVoidFinanceTransaction()

  function close() {
    setReason("")
    onOpenChange(false)
  }

  async function handleConfirm() {
    if (!transaction) return
    try {
      await voidMutation.mutateAsync({ id: transaction.id, reason: reason || undefined })
      toast.success(t("finances.voided"))
      close()
    } catch (err) {
      toast.error(getApiErrorMessage(err))
    }
  }

  return (
    <Dialog open={!!transaction} onOpenChange={(open) => (open ? onOpenChange(true) : close())}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("finances.voidTransaction")}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">{t("finances.voidConfirm", { concept: transaction?.concept })}</p>
          <div>
            <Label>{t("finances.voidReason")}</Label>
            <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder={t("finances.voidReasonPlaceholder")} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={close}>{t("common.cancel")}</Button>
          <Button variant="destructive" onClick={handleConfirm} disabled={voidMutation.isPending}>
            {voidMutation.isPending ? t("common.saving") : t("finances.void")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
