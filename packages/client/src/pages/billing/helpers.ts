import { getApiErrorMessage } from "@/lib/api"
import type { Payment, PaymentStatus } from "@/lib/types"
import { downloadReceipt } from "@/hooks/billing"
import { toast } from "sonner"

export const STATUS_LABEL: Record<PaymentStatus, string> = {
  pending: "common.status.pending",
  paid: "common.status.paid",
  overdue: "common.status.overdue",
  partial: "common.status.partial",
}

export const STATUS_VARIANT: Record<
  PaymentStatus,
  "default" | "destructive" | "outline" | "secondary"
> = {
  pending: "outline",
  paid: "default",
  overdue: "destructive",
  partial: "secondary",
}

export const PAYMENT_METHODS = [
  { value: "cash", label: "common.method.cash" },
  { value: "transfer", label: "common.method.transfer" },
  { value: "card", label: "common.method.card" },
]

export function memberName(p: Payment): string {
  const member = p.consumption?.meter?.member
  return member ? `${member.first_name} ${member.last_name}` : "—"
}

export function meterCode(p: Payment): string {
  return p.consumption?.meter?.code ?? "—"
}

export function remaining(p: Payment): number {
  return parseFloat(p.total_amount) - parseFloat(p.amount_paid)
}

export async function handleDownloadReceipt(payment: Payment) {
  try {
    await downloadReceipt(payment.id)
  } catch (err) {
    toast.error(getApiErrorMessage(err))
  }
}
