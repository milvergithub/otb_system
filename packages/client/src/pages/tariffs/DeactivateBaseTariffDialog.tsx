import { useTranslation } from "react-i18next"
import { getApiErrorMessage } from "@/lib/api"
import type { BaseTariff } from "@/lib/types"
import { useDeleteBaseTariff } from "@/hooks/tariffs"
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

interface DeactivateBaseTariffDialogProps {
  deactivating: BaseTariff | null
  onOpenChange: (open: boolean) => void
}

export default function DeactivateBaseTariffDialog({
  deactivating,
  onOpenChange,
}: DeactivateBaseTariffDialogProps) {
  const { t } = useTranslation()
  const deleteMutation = useDeleteBaseTariff()

  return (
    <AlertDialog
      open={!!deactivating}
      onOpenChange={(open) => !open && onOpenChange(false)}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("tariffs.deactivateBaseTitle")}</AlertDialogTitle>
          <AlertDialogDescription>
            {t("tariffs.deactivateDescription", { name: deactivating?.name })}
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
                    toast.success(t("tariffs.baseDeactivated"))
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
