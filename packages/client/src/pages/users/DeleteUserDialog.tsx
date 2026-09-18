import { useTranslation } from "react-i18next"
import { getApiErrorMessage } from "@/lib/api"
import { useDeleteUser } from "@/hooks/users"
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

interface DeleteUserDialogProps {
  deleteId: string | null
  onOpenChange: (open: boolean) => void
}

export default function DeleteUserDialog({
  deleteId,
  onOpenChange,
}: DeleteUserDialogProps) {
  const { t } = useTranslation()
  const deleteMutation = useDeleteUser()

  return (
    <AlertDialog
      open={deleteId !== null}
      onOpenChange={(open) => !open && onOpenChange(false)}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("users.deleteTitle")}</AlertDialogTitle>
          <AlertDialogDescription>
            {t("users.deleteDescription")}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
          <AlertDialogAction
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            onClick={() => {
              if (deleteId) {
                deleteMutation.mutate(deleteId, {
                  onSuccess: () => {
                    toast.success(t("users.deleted"))
                    onOpenChange(false)
                  },
                  onError: (err) => toast.error(getApiErrorMessage(err)),
                })
              }
            }}
          >
            {t("common.delete")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
