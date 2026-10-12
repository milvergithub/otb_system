import { useRef, useState } from "react"
import { useTranslation } from "react-i18next"
import { Upload } from "lucide-react"
import { getApiErrorMessage } from "@/lib/api"
import { useImportMembersCsv } from "@/hooks/members"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { toast } from "sonner"

const IMPORT_WELCOME_MAX_ROWS = 20

interface ImportMembersDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export default function ImportMembersDialog({
  open,
  onOpenChange,
}: ImportMembersDialogProps) {
  const { t } = useTranslation()
  const importMutation = useImportMembersCsv()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [fileName, setFileName] = useState("")
  const [csvContent, setCsvContent] = useState("")
  const [sendWelcome, setSendWelcome] = useState(false)
  const [welcomeDisabled, setWelcomeDisabled] = useState(false)

  function reset() {
    setFileName("")
    setCsvContent("")
    setSendWelcome(false)
    setWelcomeDisabled(false)
  }

  function handleOpenChange(next: boolean) {
    if (!next) reset()
    onOpenChange(next)
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const content = ev.target?.result as string
      const dataRows = content
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean)
        .slice(1).length
      const disabled = dataRows > IMPORT_WELCOME_MAX_ROWS
      setFileName(file.name)
      setCsvContent(content)
      setWelcomeDisabled(disabled)
      if (disabled) setSendWelcome(false)
    }
    reader.readAsText(file)
    e.target.value = ""
  }

  function handleImport() {
    if (!csvContent) return
    importMutation.mutate(
      { csvContent, sendWelcome: welcomeDisabled ? false : sendWelcome },
      {
        onSuccess: (result) => {
          if (result.errors.length === 0) {
            toast.success(t("members.importSuccess", { count: result.created }))
          } else {
            toast.warning(
              t("members.importPartial", {
                created: result.created,
                errors: result.errors.length,
              }),
            )
          }
          handleOpenChange(false)
        },
        onError: (err) => toast.error(getApiErrorMessage(err)),
      },
    )
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("members.importTitle")}</DialogTitle>
          <DialogDescription>{t("members.importDesc")}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv"
            className="hidden"
            onChange={handleFileChange}
          />
          <Button
            type="button"
            variant="outline"
            className="w-full justify-start font-normal"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="mr-2 size-4 shrink-0" />
            <span className="truncate">
              {fileName || t("members.selectFile")}
            </span>
          </Button>
          <div className="space-y-2">
            <label
              className={`flex items-center gap-2 text-sm ${
                welcomeDisabled
                  ? "cursor-not-allowed opacity-60"
                  : "cursor-pointer"
              }`}
            >
              <Checkbox
                checked={sendWelcome}
                disabled={welcomeDisabled}
                onCheckedChange={(c) => setSendWelcome(c === true)}
              />
              {t("members.sendWelcome")}
            </label>
            {welcomeDisabled && (
              <p className="text-xs text-muted-foreground">
                {t("members.sendWelcomeTooMany", {
                  max: IMPORT_WELCOME_MAX_ROWS,
                })}
              </p>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            onClick={() => handleOpenChange(false)}
          >
            {t("common.cancel")}
          </Button>
          <Button
            type="button"
            onClick={handleImport}
            disabled={!csvContent || importMutation.isPending}
          >
            {importMutation.isPending
              ? t("members.importing")
              : t("members.importCsv")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
