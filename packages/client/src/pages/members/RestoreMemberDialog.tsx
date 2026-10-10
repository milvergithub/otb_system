import { useTranslation } from "react-i18next"
import { getApiErrorMessage } from "@/lib/api"
import type { Member } from "@/lib/types"
import { useRestoreMember } from "@/hooks/members"
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

interface RestoreMemberDialogProps {
  restoring: Member | null
  onOpenChange: (open: boolean) => void
}

export default function RestoreMemberDialog({
  restoring,
  onOpenChange,
}: RestoreMemberDialogProps) {
  const { t } = useTranslation()
  const restoreMember = useRestoreMember()

  return (
    <AlertDialog
      open={!!restoring}
      onOpenChange={(open) => !open && onOpenChange(false)}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("members.restoreTitle")}</AlertDialogTitle>
          <AlertDialogDescription>
            {t("members.restoreDesc", {
              name: `${restoring?.first_name} ${restoring?.last_name}`,
            })}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
          <AlertDialogAction
            onClick={() =>
              restoreMember.mutate(restoring!.id, {
                onSuccess: () => {
                  toast.success(t("members.restored"))
                  onOpenChange(false)
                },
                onError: (err) => toast.error(getApiErrorMessage(err)),
              })
            }
          >
            {restoreMember.isPending ? t("members.restoring") : t("members.restore")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}