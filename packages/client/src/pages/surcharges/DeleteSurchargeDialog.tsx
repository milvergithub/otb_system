import { useTranslation } from "react-i18next"
import { getApiErrorMessage } from "@/lib/api"
import type { Surcharge } from "@/lib/types"
import { useDeleteSurcharge } from "@/hooks/billing"
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

interface DeleteSurchargeDialogProps {
  deleting: Surcharge | null
  onOpenChange: (open: boolean) => void
}

export default function DeleteSurchargeDialog({
  deleting,
  onOpenChange,
}: DeleteSurchargeDialogProps) {
  const { t } = useTranslation()
  const deleteMutation = useDeleteSurcharge()

  return (
    <AlertDialog
      open={!!deleting}
      onOpenChange={(open) => !open && onOpenChange(false)}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("surcharges.deleteTitle")}</AlertDialogTitle>
          <AlertDialogDescription>
            {t("surcharges.deleteDescription", { name: deleting?.name })}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
          <AlertDialogAction
            className="bg-destructive text-destructive-foreground"
            onClick={() => {
              if (deleting) {
                deleteMutation.mutate(deleting.id, {
                  onSuccess: () => {
                    toast.success(t("surcharges.deleted"))
                    onOpenChange(false)
                  },
                  onError: (err) => toast.error(getApiErrorMessage(err)),
                })
              }
            }}
          >
            {deleteMutation.isPending ? t("common.deleting") : t("common.delete")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
