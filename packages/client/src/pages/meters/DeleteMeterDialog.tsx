import { useTranslation } from "react-i18next"
import { getApiErrorMessage } from "@/lib/api"
import type { Meter } from "@/lib/types"
import { useDeleteMeter } from "@/hooks/meters"
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

interface DeleteMeterDialogProps {
  deleting: Meter | null
  onOpenChange: (open: boolean) => void
}

export default function DeleteMeterDialog({
  deleting,
  onOpenChange,
}: DeleteMeterDialogProps) {
  const { t } = useTranslation()
  const deleteMutation = useDeleteMeter()

  return (
    <AlertDialog
      open={!!deleting}
      onOpenChange={(open) => !open && onOpenChange(false)}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("meters.deleteTitle")}</AlertDialogTitle>
          <AlertDialogDescription>
            {t("meters.deleteDescription", { code: deleting?.code })}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
          <AlertDialogAction
            className="bg-destructive text-destructive-foreground"
            onClick={() =>
              deleteMutation.mutate(deleting!.id, {
                onSuccess: () => {
                  toast.success(t("meters.deleted"))
                  onOpenChange(false)
                },
                onError: (err) => toast.error(getApiErrorMessage(err)),
              })
            }
          >
            {deleteMutation.isPending ? t("common.deleting") : t("common.delete")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
