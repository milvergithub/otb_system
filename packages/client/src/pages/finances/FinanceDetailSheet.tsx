import { useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"
import { useTranslation } from "react-i18next"
import { api } from "@/lib/api"
import { ApiPath } from "@/lib/apiPath"
import { queryKeys } from "@/lib/utils/query"
import { useGetFinanceTransaction, useAddFinanceDocument, useDeleteFinanceDocument } from "@/hooks/finances"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Separator } from "@/components/ui/separator"
import { Label } from "@/components/ui/label"
import FileUpload from "@/components/FileUpload"
import type { FinanceTransaction } from "@/lib/types"

interface FinanceDetailSheetProps {
  transaction: FinanceTransaction | null
  onOpenChange: (open: boolean) => void
}

export default function FinanceTransactionDetailSheet({ transaction, onOpenChange }: FinanceDetailSheetProps) {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const addDocument = useAddFinanceDocument()
  const deleteDocument = useDeleteFinanceDocument()
  const { data: detail } = useGetFinanceTransaction(transaction?.id)

  const documents = detail?.documents ?? []
  const categoryName = detail?.category?.name ?? t("common.none")

  async function openDoc(id: string, documentId: string) {
    try {
      const res = await api.get(ApiPath.Finances.DOCUMENT_CONTENT(id, documentId), { responseType: "blob" })
      const contentType = (res.headers["content-type"] as string) ?? "application/octet-stream"
      const url = window.URL.createObjectURL(new Blob([res.data], { type: contentType }))
      window.open(url, "_blank")
      window.setTimeout(() => window.URL.revokeObjectURL(url), 60_000)
    } catch {
      toast.error(t("finances.errorDownload"))
    }
  }

  function handlePrepared(payload: { fileBase64: string; fileName: string; mimeType: string }) {
    if (!transaction) return
    addDocument.mutate(
      { id: transaction.id, fileBase64: payload.fileBase64, fileName: payload.fileName },
      {
        onSuccess: () => {
          void queryClient.invalidateQueries({ queryKey: queryKeys.finances.detail(transaction.id) })
          toast.success(t("finances.documentAdded"))
        },
        onError: () => toast.error(t("common.error")),
      },
    )
  }

  function handleDeleteDocument(documentId: string) {
    if (!transaction) return
    deleteDocument.mutate(
      { id: transaction.id, documentId },
      {
        onSuccess: () => {
          void queryClient.invalidateQueries({ queryKey: queryKeys.finances.detail(transaction.id) })
          toast.success(t("finances.documentDeleted"))
        },
        onError: () => toast.error(t("common.error")),
      },
    )
  }

  const tx = detail ?? transaction
  if (!tx) return null

  return (
    <Sheet open={!!transaction} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="overflow-y-auto sm:max-w-lg">
        <SheetHeader>
          <SheetTitle>{t("finances.transaction")}</SheetTitle>
          <SheetDescription>{tx.concept}</SheetDescription>
        </SheetHeader>
        <div className="flex-1 space-y-4 overflow-y-auto">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={tx.status === "active" ? "default" : "secondary"}>
              {tx.status === "active" ? t("finances.status.active") : t("finances.status.voided")}
            </Badge>
            <Badge variant="outline">{tx.type === "income" ? t("finances.type.income") : t("finances.type.expense")}</Badge>
          </div>
          <dl className="grid grid-cols-2 gap-2 text-sm">
            <dt className="font-medium text-muted-foreground">{t("finances.amount")}</dt>
            <dd>{tx.amount}</dd>
            <dt className="font-medium text-muted-foreground">{t("finances.date")}</dt>
            <dd>{tx.date.slice(0, 10)}</dd>
            <dt className="font-medium text-muted-foreground">{t("finances.category")}</dt>
            <dd>{categoryName}</dd>
            <dt className="font-medium text-muted-foreground">{t("finances.paymentMethod")}</dt>
            <dd>{tx.payment_method ?? t("common.none")}</dd>
            <dt className="font-medium text-muted-foreground">{t("finances.provider")}</dt>
            <dd>{tx.provider ?? t("common.none")}</dd>
            <dt className="font-medium text-muted-foreground">{t("finances.sourceType")}</dt>
            <dd>{tx.source_type ?? t("common.none")}</dd>
            <dt className="font-medium text-muted-foreground">{t("finances.reference")}</dt>
            <dd>{tx.reference ?? t("common.none")}</dd>
          </dl>
          {tx.notes ? (
            <>
              <Separator />
              <div>
                <Label className="text-sm font-medium text-muted-foreground">{t("finances.notesLabel")}</Label>
                <p className="text-sm">{tx.notes}</p>
              </div>
            </>
          ) : null}

          <Separator />
          <h3 className="text-sm font-semibold">{t("finances.documents")}</h3>
          <FileUpload onPrepared={handlePrepared} allowImageCrop={false} />
          <div className="space-y-2">
            {documents.map((d) => (
              <div key={d.id} className="flex items-center justify-between gap-2 text-sm">
                <div className="truncate">{d.file_name}</div>
                <div className="flex gap-1">
                  <Button variant="ghost" size="sm" onClick={() => openDoc(tx.id, d.id)}>
                    {t("common.download")}
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => handleDeleteDocument(d.id)}>
                    {t("common.delete")}
                  </Button>
                </div>
              </div>
            ))}
            {documents.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t("finances.noDocuments")}</p>
            ) : null}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
