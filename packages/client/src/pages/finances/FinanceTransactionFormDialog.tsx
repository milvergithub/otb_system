import { useEffect, useState, type FormEvent } from "react"
import { useForm, Controller, useWatch } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useTranslation } from "react-i18next"
import type { TFunction } from "i18next"
import { toast } from "sonner"
import { requiredString } from "@/lib/validation"
import { getApiErrorMessage } from "@/lib/api"
import type { FinanceTransaction, FinanceTransactionType, PaymentMethod } from "@/lib/types"
import { useAssetsSelect } from "@/hooks/assets"
import { useAllMembers } from "@/hooks/members"
import { useSearchUsers } from "@/hooks/users"
import { useAuth } from "@/lib/auth"
import {
  useAddFinanceDocument,
  useAddFinanceTransaction,
  useEditFinanceTransaction,
  useFinanceCategories,
} from "@/hooks/finances"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { ComboboxSelect } from "@/components/ui/combobox"
import { DatePicker } from "@/components/ui/date-picker"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import FileUpload from "@/components/FileUpload"
import { METHOD_OPTIONS } from "./constants"

const financeFormSchema = (t: TFunction) =>
  z.object({
    type: z.enum(["income", "expense"]),
    date: requiredString(t),
    amount: z
      .string()
      .min(1, t("common.required"))
      .refine((v) => Number(v) > 0, t("finances.amountPositive")),
    concept: requiredString(t),
    categoryId: z.string().optional(),
    paymentMethod: z.enum(["cash", "transfer", "card", "qr", "other"]),
    reference: z.string().optional(),
    memberId: z.string().optional(),
    assetId: z.string().optional(),
    provider: z.string().optional(),
    notes: z.string().optional(),
    responsibleUserId: z.string().optional(),
    collectorUserId: z.string().optional(),
  })

type FinanceFormValues = z.infer<ReturnType<typeof financeFormSchema>>

const DEFAULT_FORM: FinanceFormValues = {
  type: "income",
  date: "",
  amount: "",
  concept: "",
  categoryId: "",
  paymentMethod: "cash",
  reference: "",
  memberId: "",
  assetId: "",
  provider: "",
  notes: "",
  responsibleUserId: "",
  collectorUserId: "",
}

interface FinanceTransactionFormDialogProps {
  open: boolean
  editing: FinanceTransaction | null
  onOpenChange: (open: boolean) => void
}

interface PendingDocument {
  fileBase64: string
  fileName: string
}

export default function FinanceTransactionFormDialog({
  open,
  editing,
  onOpenChange,
}: FinanceTransactionFormDialogProps) {
  const { t } = useTranslation()
  const [pendingDocument, setPendingDocument] = useState<PendingDocument | null>(null)

  const form = useForm<FinanceFormValues>({
    resolver: zodResolver(financeFormSchema(t)),
    defaultValues: DEFAULT_FORM,
  })

  const { data: categories } = useFinanceCategories()
  const { data: members } = useAllMembers()
  const { data: assets } = useAssetsSelect()
  const { hasPermission } = useAuth()
  const canPickResponsible = hasPermission("users.read")
  const { data: users } = useSearchUsers(undefined, canPickResponsible)

  const addMutation = useAddFinanceTransaction()
  const editMutation = useEditFinanceTransaction()
  const addDocumentMutation = useAddFinanceDocument()

  const type = useWatch({ control: form.control, name: "type" })
  const filteredCategories =
    categories?.filter((c) => c.type === type || c.type === "both") ?? []

  useEffect(() => {
    if (!open) return
    form.reset(
      editing
        ? {
            type: editing.type,
            date: editing.date.slice(0, 10),
            amount: String(editing.amount),
            concept: editing.concept,
            categoryId: editing.category_id ?? "",
            paymentMethod: (editing.payment_method as PaymentMethod) ?? "cash",
            reference: editing.reference ?? "",
            memberId: editing.member_id ?? "",
            assetId: editing.asset_id ?? "",
            provider: editing.provider ?? "",
            notes: editing.notes ?? "",
            responsibleUserId: editing.responsible_user_id ?? "",
            collectorUserId: editing.collector_user_id ?? "",
          }
        : DEFAULT_FORM,
    )
  }, [open, editing, form])

  function close() {
    setPendingDocument(null)
    onOpenChange(false)
  }

  function uploadDocument(transactionId: string, document: PendingDocument) {
    addDocumentMutation.mutate(
      { id: transactionId, fileBase64: document.fileBase64, fileName: document.fileName },
      { onError: (err) => toast.error(getApiErrorMessage(err)) },
    )
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    form.handleSubmit((values) => {
      const payload = {
        type: values.type as FinanceTransactionType,
        date: values.date,
        amount: Number(values.amount),
        concept: values.concept.trim(),
        categoryId: values.categoryId || undefined,
        paymentMethod: values.paymentMethod || undefined,
        reference: values.reference || undefined,
        memberId: values.memberId || undefined,
        assetId: values.assetId || undefined,
        provider: values.provider || undefined,
        notes: values.notes || undefined,
        responsibleUserId: values.responsibleUserId || undefined,
        collectorUserId: values.collectorUserId || undefined,
      }

      const onSuccess = (transaction: FinanceTransaction) => {
        if (pendingDocument) uploadDocument(transaction.id, pendingDocument)
        toast.success(editing ? t("finances.updated") : t("finances.created"))
        close()
      }

      if (editing) {
        editMutation.mutate(
          { id: editing.id, ...payload },
          { onSuccess, onError: (err) => toast.error(getApiErrorMessage(err)) },
        )
      } else {
        addMutation.mutate(payload, {
          onSuccess,
          onError: (err) => toast.error(getApiErrorMessage(err)),
        })
      }
    })()
  }

  const isPending = addMutation.isPending || editMutation.isPending

  return (
    <Dialog open={open} onOpenChange={(next) => (next ? onOpenChange(true) : close())}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {editing ? t("finances.editTransaction") : t("finances.newTransaction")}
          </DialogTitle>
          <DialogDescription>{t("finances.transactionFormDescription")}</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <Label>{t("finances.typeLabel")}</Label>
              <Controller
                control={form.control}
                name="type"
                render={({ field }) => (
                  <ComboboxSelect
                    value={field.value}
                    onValueChange={field.onChange}
                    options={[
                      { label: t("finances.type.income"), value: "income" },
                      { label: t("finances.type.expense"), value: "expense" },
                    ]}
                  />
                )}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="date">{t("common.date")}</Label>
              <Controller
                control={form.control}
                name="date"
                render={({ field }) => (
                  <DatePicker id="date" value={field.value ?? ""} onChange={field.onChange} />
                )}
              />
              {form.formState.errors.date && (
                <p className="text-sm text-destructive">{form.formState.errors.date.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="amount">{t("finances.amount")}</Label>
              <Input id="amount" type="number" step="0.01" min="0" {...form.register("amount")} />
              {form.formState.errors.amount && (
                <p className="text-sm text-destructive">{form.formState.errors.amount.message}</p>
              )}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>{t("finances.category")}</Label>
              <Controller
                control={form.control}
                name="categoryId"
                render={({ field }) => (
                  <ComboboxSelect
                    value={field.value || ""}
                    onValueChange={field.onChange}
                    options={[
                      { label: t("finances.uncategorized"), value: "" },
                      ...filteredCategories.map((c) => ({ label: c.name, value: c.id })),
                    ]}
                    placeholder={t("common.select")}
                    searchPlaceholder={t("common.search")}
                  />
                )}
              />
            </div>
            <div className="space-y-2">
              <Label>{t("finances.paymentMethod")}</Label>
              <Controller
                control={form.control}
                name="paymentMethod"
                render={({ field }) => (
                  <ComboboxSelect
                    value={field.value || ""}
                    onValueChange={field.onChange}
                    options={METHOD_OPTIONS.map((m) => ({ label: t(`finances.method.${m}`), value: m }))}
                    placeholder={t("common.select")}
                  />
                )}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="concept">{t("finances.concept")}</Label>
            <Input id="concept" {...form.register("concept")} />
            {form.formState.errors.concept && (
              <p className="text-sm text-destructive">{form.formState.errors.concept.message}</p>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>{t("finances.member")}</Label>
              <Controller
                control={form.control}
                name="memberId"
                render={({ field }) => (
                  <ComboboxSelect
                    value={field.value || ""}
                    onValueChange={field.onChange}
                    options={[
                      { label: t("common.none"), value: "" },
                      ...(members ?? []).map((m) => ({
                        label: `${m.first_name} ${m.last_name}`,
                        value: m.id,
                      })),
                    ]}
                    placeholder={t("common.select")}
                    searchPlaceholder={t("common.search")}
                  />
                )}
              />
            </div>
            <div className="space-y-2">
              <Label>{t("finances.asset")}</Label>
              <Controller
                control={form.control}
                name="assetId"
                render={({ field }) => (
                  <ComboboxSelect
                    value={field.value || ""}
                    onValueChange={field.onChange}
                    options={[
                      { label: t("common.none"), value: "" },
                      ...(assets ?? []).map((a) => ({ label: `${a.code} · ${a.name}`, value: a.id })),
                    ]}
                    placeholder={t("common.select")}
                    searchPlaceholder={t("common.search")}
                  />
                )}
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="reference">{t("finances.reference")}</Label>
              <Input id="reference" {...form.register("reference")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="provider">{t("finances.provider")}</Label>
              <Input id="provider" {...form.register("provider")} />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>{t("finances.responsible")}</Label>
              <Controller
                control={form.control}
                name="responsibleUserId"
                render={({ field }) => (
                  <ComboboxSelect
                    value={field.value || ""}
                    onValueChange={field.onChange}
                    options={[
                      { label: t("finances.noResponsible"), value: "" },
                      ...(users ?? []).map((u) => ({
                        label: u.full_name,
                        value: u.id,
                      })),
                    ]}
                    placeholder={t("common.select")}
                    searchPlaceholder={t("common.search")}
                  />
                )}
              />
            </div>
            <div className="space-y-2">
              <Label>{t("finances.collector")}</Label>
              <Controller
                control={form.control}
                name="collectorUserId"
                render={({ field }) => (
                  <ComboboxSelect
                    value={field.value || ""}
                    onValueChange={field.onChange}
                    options={[
                      { label: t("finances.collectorAuto"), value: "" },
                      ...(users ?? []).map((u) => ({
                        label: u.full_name,
                        value: u.id,
                      })),
                    ]}
                    placeholder={t("common.select")}
                    searchPlaceholder={t("common.search")}
                  />
                )}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">{t("finances.notes")}</Label>
            <Textarea id="notes" rows={2} {...form.register("notes")} />
          </div>

          <div className="space-y-2">
            <Label>{t("finances.comprobante")}</Label>
            <FileUpload
              allowImageCrop={false}
              onPrepared={(file) =>
                setPendingDocument({ fileBase64: file.fileBase64, fileName: file.fileName })
              }
            />
            <p className="text-xs text-muted-foreground">{t("finances.comprobanteHelp")}</p>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={close}>
              {t("common.cancel")}
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? t("common.saving") : t("common.save")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}