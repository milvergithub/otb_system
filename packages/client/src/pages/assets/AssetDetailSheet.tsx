import { useState } from "react"
import { useTranslation } from "react-i18next"
import { formatCurrency, formatDate } from "@/lib/utils"
import { ApiPath } from "@/lib/apiPath"
import { getAccessToken } from "@/lib/api"
import type { Asset, AssetMaintenance, AssetMovement } from "@/lib/types"
import { useGetAsset, useAssetMovements, useAssetMaintenances, useAssetDocuments, useAddAssetDocument, useDeleteAssetDocument } from "@/hooks/assets"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { CONDITION_LABEL, CONDITION_VARIANT, MOVEMENT_LABEL, STATUS_LABEL, STATUS_VARIANT } from "./constants"
import { formatMovementRange, responsibleLabel } from "./helpers"
import AssetLoanDialog from "./AssetLoanDialog"
import AssetReturnDialog from "./AssetReturnDialog"
import AssetTransferDialog from "./AssetTransferDialog"
import AssetLostDialog from "./AssetLostDialog"
import AssetRetireDialog from "./AssetRetireDialog"
import AssetRestoreDialog from "./AssetRestoreDialog"
import AssetMaintenanceDialog from "./AssetMaintenanceDialog"
import AssetMaintenanceFinishDialog from "./AssetMaintenanceFinishDialog"
import FileUpload from "@/components/FileUpload"
import { toast } from "sonner"

interface Props {
  asset: Asset | null
  onOpenChange: (open: boolean) => void
}

export default function AssetDetailSheet({ asset, onOpenChange }: Props) {
  const { t } = useTranslation()
  const [tab, setTab] = useState("data")
  const [dialog, setDialog] = useState<string | null>(null)
  const [maintenance, setMaintenance] = useState<AssetMaintenance | null>(null)

  const { data: detail } = useGetAsset(asset?.id, !!asset)
  const { data: movements } = useAssetMovements(asset?.id, !!asset)
  const { data: maintenances } = useAssetMaintenances(asset?.id, !!asset)
  const { data: documents } = useAssetDocuments(asset?.id, !!asset)
  const addDocument = useAddAssetDocument()
  const deleteDocument = useDeleteAssetDocument()

  if (!asset) return null

  function openAssetDocument(documentId: string) {
    const token = getAccessToken()
    fetch(`${import.meta.env.VITE_API_URL ?? "http://localhost:3001/api"}${ApiPath.Assets.DOCUMENT_CONTENT(asset!.id, documentId)}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load document")
        return res.blob()
      })
      .then((blob) => {
        const url = URL.createObjectURL(blob)
        window.open(url, "_blank")
      })
      .catch(() => toast.error(t("errors.default")))
  }

  function handleDocumentReady(file: { fileBase64: string; fileName: string; mimeType: string }) {
    addDocument.mutate(
      { id: asset!.id, fileBase64: file.fileBase64, fileName: file.fileName },
      { onSuccess: () => toast.success(t("assets.documentAdded")), onError: (err) => toast.error(String(err)) },
    )
  }

  return (
    <>
      <Sheet open={!!asset} onOpenChange={(open) => !open && onOpenChange(false)}>
        <SheetContent side="right" className="data-[side=right]:w-full data-[side=right]:sm:max-w-none data-[side=right]:sm:w-1/2 space-y-4">
          <SheetHeader>
            <SheetTitle className="font-mono">{asset.code}</SheetTitle>
            <SheetDescription>{asset.name}</SheetDescription>
          </SheetHeader>

          <Tabs value={tab} onValueChange={setTab}>
            <TabsList>
              <TabsTrigger value="data">{t("assets.tabs.data")}</TabsTrigger>
              <TabsTrigger value="movements">{t("assets.tabs.movements")}</TabsTrigger>
              <TabsTrigger value="maintenance">{t("assets.tabs.maintenance")}</TabsTrigger>
              <TabsTrigger value="documents">{t("assets.tabs.documents")}</TabsTrigger>
            </TabsList>

            <TabsContent value="data">
              <div className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  <Badge variant={STATUS_VARIANT[asset.status]}>{t(STATUS_LABEL[asset.status])}</Badge>
                  <Badge variant={CONDITION_VARIANT[asset.condition]}>{t(CONDITION_LABEL[asset.condition])}</Badge>
                </div>
                <dl className="grid grid-cols-2 gap-2 text-sm">
                  <dt className="text-muted-foreground">{t("assets.category")}</dt><dd>{asset.category?.name ?? "—"}</dd>
                  <dt className="text-muted-foreground">{t("assets.location")}</dt><dd>{asset.location?.name ?? "—"}</dd>
                  <dt className="text-muted-foreground">{t("assets.responsible")}</dt><dd>{responsibleLabel(detail ?? asset)}</dd>
                  <dt className="text-muted-foreground">{t("assets.acquisitionDate")}</dt><dd>{asset.acquisition_date ? formatDate(asset.acquisition_date) : "—"}</dd>
                  <dt className="text-muted-foreground">{t("assets.acquisitionValue")}</dt><dd>{formatCurrency(asset.acquisition_value ?? "0")}</dd>
                  <dt className="text-muted-foreground">{t("assets.description")}</dt><dd>{asset.description ?? "—"}</dd>
                </dl>
              </div>
            </TabsContent>

            <TabsContent value="movements">
              {movements?.length ? (
                <div className="space-y-2">
                  {movements.map((m) => (
                    <div key={m.id} className="rounded border p-2 text-sm">
                      <p className="font-medium">{t(MOVEMENT_LABEL[m.type])} · {formatDate(m.moved_at)}</p>
                      <p className="text-muted-foreground">{formatMovementRange(m)}</p>
                      <p className="text-muted-foreground">{m.motive}</p>
                      {m.responsibleMember ? <p className="text-muted-foreground">{m.responsibleMember.first_name} {m.responsibleMember.last_name}</p> : null}
                      {m.responsibleUser ? <p className="text-muted-foreground">{m.responsibleUser.full_name}</p> : null}
                      {m.returned_at ? <p className="text-muted-foreground">{t("assets.returnedAt")}: {formatDate(m.returned_at)}</p> : null}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">{t("assets.noMovements")}</p>
              )}
            </TabsContent>

            <TabsContent value="maintenance">
              {maintenances?.length ? (
                <div className="space-y-2">
                  {maintenances.map((m) => (
                    <div key={m.id} className="rounded border p-2 text-sm">
                      <p className="font-medium">{m.reason}</p>
                      <p className="text-muted-foreground">{formatDate(m.started_at)} {m.finished_at ? `→ ${formatDate(m.finished_at)}` : ""}</p>
                      <p className="text-muted-foreground">{formatCurrency(m.cost ?? "0")} · {m.provider ?? "—"}</p>
                      {m.expense_transaction_id ? (
                        <p className="text-xs text-muted-foreground">
                          {t("assets.maintenanceExpensed")}
                        </p>
                      ) : m.finished_at ? (
                        <p className="text-xs text-muted-foreground">{t("assets.maintenanceNotExpensed")}</p>
                      ) : null}
                      {!m.finished_at && (
                        <Button variant="outline" size="sm" className="mt-2" onClick={() => setMaintenance(m)}>
                          {t("assets.finish")}
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">{t("assets.noMaintenances")}</p>
              )}
            </TabsContent>

            <TabsContent value="documents">
              <div className="space-y-3">
                <FileUpload onPrepared={handleDocumentReady} />
                <div className="space-y-2">
                  {documents?.map((d) => (
                    <div key={d.id} className="flex items-center justify-between rounded border p-2 text-sm">
                      <div className="truncate">
                        <p className="truncate font-medium">{d.file_name}</p>
                        <p className="text-muted-foreground">{d.kind} · {formatDate(d.created_at)}</p>
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => openAssetDocument(d.id)}>{t("common.view")}</Button>
                        <Button variant="destructive" size="sm" onClick={() => deleteDocument.mutate({ id: asset.id, documentId: d.id })}>{t("common.delete")}</Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </TabsContent>
          </Tabs>

          <div className="mt-4 flex flex-wrap gap-2">
            {asset.status === "active" && (
              <>
                <Button variant="outline" size="sm" onClick={() => setDialog("loan")}>{t("assets.loan")}</Button>
                <Button variant="outline" size="sm" onClick={() => setDialog("transfer")}>{t("assets.transfer")}</Button>
                <Button variant="outline" size="sm" onClick={() => setDialog("maintenance")}>{t("assets.maintenance")}</Button>
                <Button variant="outline" size="sm" onClick={() => setDialog("lost")}>{t("assets.markLost")}</Button>
                <Button variant="outline" size="sm" onClick={() => setDialog("retire")}>{t("assets.retire")}</Button>
              </>
            )}
            {asset.status === "loaned" && <Button variant="outline" size="sm" onClick={() => setDialog("return")}>{t("assets.return")}</Button>}
            {asset.status === "in_maintenance" && <Button variant="outline" size="sm" onClick={() => setDialog("finish")} disabled>{t("assets.finish")}</Button>}
            {asset.status === "retired" && <Button variant="outline" size="sm" onClick={() => setDialog("restore")}>{t("assets.restore")}</Button>}
          </div>
        </SheetContent>
      </Sheet>

      <AssetLoanDialog asset={asset} open={dialog === "loan"} onOpenChange={(open) => !open && setDialog(null)} />
      <AssetReturnDialog asset={asset} open={dialog === "return"} onOpenChange={(open) => !open && setDialog(null)} />
      <AssetTransferDialog asset={asset} open={dialog === "transfer"} onOpenChange={(open) => !open && setDialog(null)} />
      <AssetLostDialog asset={asset} open={dialog === "lost"} onOpenChange={(open) => !open && setDialog(null)} />
      <AssetRetireDialog asset={asset} open={dialog === "retire"} onOpenChange={(open) => !open && setDialog(null)} />
      <AssetRestoreDialog asset={asset} open={dialog === "restore"} onOpenChange={(open) => !open && setDialog(null)} />
      <AssetMaintenanceDialog asset={asset} open={dialog === "maintenance"} onOpenChange={(open) => !open && setDialog(null)} />
      <AssetMaintenanceFinishDialog asset={asset} maintenance={maintenance} open={!!maintenance} onOpenChange={(open) => !open && setMaintenance(null)} />
    </>
  )
}
