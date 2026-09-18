import { useTranslation } from "react-i18next"
import { getApiErrorMessage } from "@/lib/api"
import type { Role } from "@/lib/types"
import { useDeleteRole } from "@/hooks/roles"
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

interface DeleteRoleDialogProps {
  deleting: Role | null
  onOpenChange: (open: boolean) => void
}

export default function DeleteRoleDialog({
  deleting,
  onOpenChange,
}: DeleteRoleDialogProps) {
  const { t } = useTranslation()
  const deleteMutation = useDeleteRole()

  return (
    <AlertDialog
      open={!!deleting}
      onOpenChange={(open) => !open && onOpenChange(false)}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("roles.deleteTitle")}</AlertDialogTitle>
          <AlertDialogDescription>
            {t("roles.deleteDescription", { name: deleting?.name })}
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
                    toast.success(t("roles.deleted"))
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
