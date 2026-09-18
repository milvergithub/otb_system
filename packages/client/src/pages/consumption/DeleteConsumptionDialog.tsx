import { useTranslation } from "react-i18next"
import { monthNames } from "@/lib/utils"
import { getApiErrorMessage } from "@/lib/api"
import type { Consumption } from "@/lib/types"
import { useDeleteConsumption } from "@/hooks/consumptions"
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

interface DeleteConsumptionDialogProps {
  deleting: Consumption | null
  onOpenChange: (open: boolean) => void
}

export default function DeleteConsumptionDialog({
  deleting,
  onOpenChange,
}: DeleteConsumptionDialogProps) {
  const { t } = useTranslation()
  const months = monthNames()
  const deleteMutation = useDeleteConsumption()

  return (
    <AlertDialog
      open={!!deleting}
      onOpenChange={(open) => !open && onOpenChange(false)}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("consumption.deleteTitle")}</AlertDialogTitle>
          <AlertDialogDescription>
            {t("consumption.deleteDescription", {
              code: deleting ? (deleting.meter?.code ?? "") : "",
              period: deleting
                ? `${months[deleting.month - 1]} ${deleting.year}`
                : "",
            })}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
          <AlertDialogAction
            className="bg-destructive text-destructive-foreground"
            onClick={() =>
              deleteMutation.mutate(deleting!.id, {
                onSuccess: () => {
                  toast.success(t("consumption.deleted"))
                  onOpenChange(false)
                },
                onError: (err) => toast.error(getApiErrorMessage(err)),
              })
            }
          >
            {deleteMutation.isPending
              ? t("common.deleting")
              : t("common.delete")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}