import { useTranslation } from "react-i18next"
import { getApiErrorMessage } from "@/lib/api"
import type { MemberType } from "@/lib/types"
import { useDeleteMemberType } from "@/hooks/memberTypes"
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

interface DeleteMemberTypeDialogProps {
  deleting: MemberType | null
  onOpenChange: (open: boolean) => void
}

export default function DeleteMemberTypeDialog({
  deleting,
  onOpenChange,
}: DeleteMemberTypeDialogProps) {
  const { t } = useTranslation()
  const deleteType = useDeleteMemberType()

  const memberCount = deleting?.member_count ?? 0

  return (
    <AlertDialog
      open={!!deleting}
      onOpenChange={(open) => !open && onOpenChange(false)}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("memberTypes.deleteTitle")}</AlertDialogTitle>
          <AlertDialogDescription>
            {t("memberTypes.deleteDesc", {
              name: deleting?.name,
            })}
          </AlertDialogDescription>
          {memberCount > 0 && (
            <AlertDialogDescription className="text-destructive">
              {t("memberTypes.deleteBlocked", {
                count: memberCount,
              })}
            </AlertDialogDescription>
          )}
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
          <AlertDialogAction
            className="bg-destructive text-destructive-foreground"
            disabled={memberCount > 0}
            onClick={() =>
              deleteType.mutate(deleting!.id, {
                onSuccess: () => {
                  toast.success(t("memberTypes.deleted"))
                  onOpenChange(false)
                },
                onError: (err) => toast.error(getApiErrorMessage(err)),
              })
            }
          >
            {deleteType.isPending ? t("common.deleting") : t("common.delete")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}