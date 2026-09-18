import { useTranslation } from "react-i18next"
import { getApiErrorMessage } from "@/lib/api"
import type { Discount } from "@/lib/types"
import { useDeleteDiscount } from "@/hooks/billing"
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

interface DeleteDiscountDialogProps {
  deleting: Discount | null
  onOpenChange: (open: boolean) => void
}

export default function DeleteDiscountDialog({
  deleting,
  onOpenChange,
}: DeleteDiscountDialogProps) {
  const { t } = useTranslation()
  const deleteMutation = useDeleteDiscount()

  return (
    <AlertDialog
      open={!!deleting}
      onOpenChange={(open) => !open && onOpenChange(false)}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("discounts.deleteTitle")}</AlertDialogTitle>
          <AlertDialogDescription>
            {t("discounts.deleteDescription", { name: deleting?.name })}
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
                    toast.success(t("discounts.deleted"))
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
