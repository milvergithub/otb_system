import { useRef, useState } from "react"
import { useTranslation } from "react-i18next"
import { UploadCloud } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import ImageCropDialog from "@/components/ImageCropDialog"

interface PreparedFile {
  fileBase64: string
  fileName: string
  mimeType: string
}

interface FileUploadProps {
  id?: string
  label?: string
  accept?: string
  onPrepared?: (file: PreparedFile) => void
  allowImageCrop?: boolean
  disabled?: boolean
  helpText?: string
}

export default function FileUpload({
  id,
  label,
  accept = "image/*,application/pdf",
  onPrepared,
  allowImageCrop = true,
  disabled,
  helpText,
}: FileUploadProps) {
  const { t } = useTranslation()
  const inputRef = useRef<HTMLInputElement | null>(null)
  const [previewSrc, setPreviewSrc] = useState<string | null>(null)
  const [pendingType, setPendingType] = useState<string | null>(null)
  const [pendingName, setPendingName] = useState("")
  const [cropOpen, setCropOpen] = useState(false)

  function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      setPendingType(file.type)
      setPendingName(file.name)
      if (file.type.startsWith("image/") && allowImageCrop && allowImageCrop) {
        setPreviewSrc(result)
        setCropOpen(true)
        return
      }
      onPrepared?.({ fileBase64: result, fileName: file.name, mimeType: file.type })
    }
    reader.readAsDataURL(file)
  }

  function handleCropped(result: string) {
    setCropOpen(false)
    onPrepared?.({ fileBase64: result, fileName: pendingName, mimeType: pendingType || "image/jpeg" })
  }

  return (
    <div className="space-y-2">
      {label ? <Label htmlFor={id}>{label}</Label> : null}
      <div className="flex items-center gap-2">
        <Input
          ref={inputRef}
          id={id}
          type="file"
          accept={accept}
          hidden
          disabled={disabled}
          onChange={onChange}
        />
        <Button
          type="button"
          variant="outline"
          disabled={disabled}
          onClick={() => inputRef.current?.click()}
        >
          <UploadCloud className="mr-2 size-4" />
          {t("common.uploadFile", "Subir archivo")}
        </Button>
        {previewSrc ? (
          <span className="text-sm text-muted-foreground truncate">{pendingName}</span>
        ) : null}
      </div>
      {helpText ? <p className="text-xs text-muted-foreground">{helpText}</p> : null}
      {previewSrc ? (
        <ImageCropDialog
          open={cropOpen}
          onOpenChange={setCropOpen}
          src={previewSrc}
          onConfirm={handleCropped}
        />
      ) : null}
    </div>
  )
}