import { useState } from "react"
import { useTranslation } from "react-i18next"
import { Check, Copy, KeyRound, TriangleAlert } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"

export interface GeneratedCredentials {
  fullName: string
  email: string
  password: string
}

interface CredentialsDialogProps {
  credentials: GeneratedCredentials | null
  onOpenChange: (open: boolean) => void
}

/**
 * One-shot display of a password minted by the server. The plaintext exists
 * only in this response, so closing the dialog discards it for good — the
 * user has to regenerate to get a new one.
 */
export default function CredentialsDialog({
  credentials,
  onOpenChange,
}: CredentialsDialogProps) {
  const { t } = useTranslation()
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    if (!credentials) return
    try {
      await navigator.clipboard.writeText(credentials.password)
      setCopied(true)
      toast.success(t("users.passwordCopied"))
    } catch {
      toast.error(t("errors.default"))
    }
  }

  return (
    <Dialog
      open={credentials !== null}
      onOpenChange={(open) => {
        if (!open) {
          setCopied(false)
          onOpenChange(false)
        }
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <KeyRound className="size-4 text-primary" />
            {t("users.credentialsTitle")}
          </DialogTitle>
          <DialogDescription>
            {t("users.credentialsDescription", { name: credentials?.fullName })}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>{t("users.email")}</Label>
            <Input value={credentials?.email ?? ""} readOnly />
          </div>

          <div className="space-y-2">
            <Label>{t("users.generatedPassword")}</Label>
            <div className="flex gap-2">
              <Input
                value={credentials?.password ?? ""}
                readOnly
                className="font-mono"
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                onClick={handleCopy}
                aria-label={t("users.copyPassword")}
              >
                {copied ? (
                  <Check className="size-4 text-emerald-600" />
                ) : (
                  <Copy className="size-4" />
                )}
              </Button>
            </div>
          </div>

          <p className="flex gap-2 rounded-md bg-amber-50 p-3 text-xs text-amber-900 dark:bg-amber-950 dark:text-amber-100">
            <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
            <span>{t("users.passwordShownOnce")}</span>
          </p>
        </div>

        <DialogFooter>
          <Button type="button" onClick={() => onOpenChange(false)}>
            {t("common.close")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
