import { useTranslation } from "react-i18next"
import { getApiErrorMessage } from "@/lib/api"
import { useDeleteAsset } from "@/hooks/assets"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { toast } from "sonner"

interface DeleteAssetDialogProps {
  assetName?: string | null
  assetId?: string | null
  onOpenChange: (open: boolean) => void
}

export default function DeleteAssetDialog({ assetName, assetId, onOpenChange }: DeleteAssetDialogProps) {
  const { t } = useTranslation()
  const deleteAsset = useDeleteAsset()

  function handleConfirm() {
    if (!assetId) return
    deleteAsset.mutate(assetId, {
      onSuccess: () => {
        toast.success(t("assets.deleted"))
        onOpenChange(false)
      },
      onError: (err) => toast.error(getApiErrorMessage(err)),
    })
  }

  return (
    <AlertDialog open={!!assetId} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("assets.deleteTitle")}</AlertDialogTitle>
          <AlertDialogDescription>
            {t("assets.deleteConfirm", { name: assetName ?? "—" })}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
          <AlertDialogAction
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            onClick={handleConfirm}
          >
            {deleteAsset.isPending ? t("common.deleting") : t("common.delete")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
