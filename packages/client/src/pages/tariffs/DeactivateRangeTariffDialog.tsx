import { useTranslation } from "react-i18next"
import { getApiErrorMessage } from "@/lib/api"
import type { Tariff } from "@/lib/types"
import { useDeleteTariff } from "@/hooks/tariffs"
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

interface DeactivateRangeTariffDialogProps {
  deactivating: Tariff | null
  onOpenChange: (open: boolean) => void
}

export default function DeactivateRangeTariffDialog({
  deactivating,
  onOpenChange,
}: DeactivateRangeTariffDialogProps) {
  const { t } = useTranslation()
  const deleteMutation = useDeleteTariff()

  return (
    <AlertDialog
      open={!!deactivating}
      onOpenChange={(open) => !open && onOpenChange(false)}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("tariffs.deactivateRangeTitle")}</AlertDialogTitle>
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
                    toast.success(t("tariffs.rangeDeactivated"))
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
