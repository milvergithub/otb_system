import type { PaymentMethod, FinanceTransactionType, FinanceSourceType } from "@/lib/types"

export const TRANSACTION_TYPE_LABEL: Record<FinanceTransactionType, string> = {
  income: "finances.type.income",
  expense: "finances.type.expense",
}

export const SOURCE_LABEL: Record<NonNullable<FinanceSourceType>, string> = {
  manual: "finances.source.manual",
  water_bill_payment: "finances.source.waterBill",
  water_membership_fee: "finances.source.waterMembership",
  fine_payment: "finances.source.fine",
  asset_purchase: "finances.source.assetPurchase",
  asset_maintenance: "finances.source.assetMaintenance",
  donation: "finances.source.donation",
  court_rental: "finances.source.courtRental",
  other: "finances.source.other",
}

export const METHOD_LABEL: Record<NonNullable<PaymentMethod>, string> = {
  cash: "finances.method.cash",
  transfer: "finances.method.transfer",
  card: "finances.method.card",
  qr: "finances.method.qr",
  other: "finances.method.other",
}

export const METHOD_OPTIONS: PaymentMethod[] = ["cash", "transfer", "card", "qr", "other"]

export const SOURCE_OPTIONS: FinanceSourceType[] = [
  "manual",
  "water_bill_payment",
  "water_membership_fee",
  "fine_payment",
  "asset_purchase",
  "asset_maintenance",
  "donation",
  "court_rental",
  "other",
]
