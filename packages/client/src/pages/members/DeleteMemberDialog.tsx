import { useTranslation } from "react-i18next"
import { getApiErrorMessage } from "@/lib/api"
import type { Member } from "@/lib/types"
import { useDeleteMember } from "@/hooks/members"
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

interface DeleteMemberDialogProps {
  deleting: Member | null
  onOpenChange: (open: boolean) => void
}

export default function DeleteMemberDialog({
  deleting,
  onOpenChange,
}: DeleteMemberDialogProps) {
  const { t } = useTranslation()
  const deleteMember = useDeleteMember()

  return (
    <AlertDialog
      open={!!deleting}
      onOpenChange={(open) => !open && onOpenChange(false)}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("members.deleteTitle")}</AlertDialogTitle>
          <AlertDialogDescription>
            {t("members.deleteDesc", {
              name: `${deleting?.first_name} ${deleting?.last_name}`,
            })}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
          <AlertDialogAction
            className="bg-destructive text-destructive-foreground"
            onClick={() =>
              deleteMember.mutate(deleting!.id, {
                onSuccess: () => {
                  toast.success(t("members.deleted"))
                  onOpenChange(false)
                },
                onError: (err) => toast.error(getApiErrorMessage(err)),
              })
            }
          >
            {deleteMember.isPending ? t("common.deleting") : t("common.delete")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
