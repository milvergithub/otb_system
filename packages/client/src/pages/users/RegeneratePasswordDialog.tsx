import { useTranslation } from "react-i18next"
import { getApiErrorMessage } from "@/lib/api"
import { useRegeneratePassword } from "@/hooks/users"
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
import type { GeneratedCredentials } from "./CredentialsDialog"

interface RegeneratePasswordDialogProps {
  target: { id: string; fullName: string; email: string } | null
  onOpenChange: (open: boolean) => void
  onRegenerated: (credentials: GeneratedCredentials) => void
}

export default function RegeneratePasswordDialog({
  target,
  onOpenChange,
  onRegenerated,
}: RegeneratePasswordDialogProps) {
  const { t } = useTranslation()
  const regenerateMutation = useRegeneratePassword()

  return (
    <AlertDialog
      open={target !== null}
      onOpenChange={(open) => !open && onOpenChange(false)}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{t("users.regenerateTitle")}</AlertDialogTitle>
          <AlertDialogDescription>
            {t("users.regenerateDescription", { name: target?.fullName })}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
          <AlertDialogAction
            onClick={() => {
              if (!target) return
              regenerateMutation.mutate(target.id, {
                onSuccess: (created) => {
                  onOpenChange(false)
                  onRegenerated({
                    fullName: created.full_name,
                    email: created.email,
                    password: created.generatedPassword,
                  })
                },
                onError: (err) => toast.error(getApiErrorMessage(err)),
              })
            }}
          >
            {t("users.regenerateAction")}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
