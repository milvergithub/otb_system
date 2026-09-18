import { useTranslation } from "react-i18next"
import { getApiErrorMessage } from "@/lib/api"
import type { WaterShare } from "@/lib/types"
import { useDeleteShare } from "@/hooks/shares"
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

interface DeactivateShareDialogProps {
  deactivating: WaterShare | null
  onOpenChange: (open: boolean) => void
}

export default function DeactivateShareDialog({
  deactivating,
  onOpenChange,
}: DeactivateShareDialogProps) {
  const { t } = useTranslation()
  const deleteMutation = useDeleteShare()

  return (
    <AlertDialog
      open={!!deactivating}
      onOpenChange={(open) => !open && onOpenChange(false)}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("shares.deactivateTitle")}</AlertDialogTitle>
          <AlertDialogDescription>
            {t("shares.deactivateDescription", { name: deactivating?.name })}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
          <AlertDialogAction
            className="bg-destructive text-destructive-foreground"
            onClick={() => {
              if (deactivating) {
                deleteMutation.mutate(deactivating.id, {
                  onSuccess: () => {
                    toast.success(t("shares.deactivated"))
                    onOpenChange(false)
                  },
                  onError: (err) => toast.error(getApiErrorMessage(err)),
                })
              }
            }}
          >
            {t("common.deactivate")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
