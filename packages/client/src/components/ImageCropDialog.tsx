import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useTranslation } from "react-i18next"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { useRef } from "react"
import ImageCropper, { ImageCropperHandle } from "./ImageCropper"

export interface ImageCropDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  src: string
  onConfirm: (croppedBase64: string) => void
}

const ImageCropDialog: React.FC<ImageCropDialogProps> = ({
  open,
  onOpenChange,
  src,
  onConfirm,
}) => {
  const { t } = useTranslation()
  const cropperRef = useRef<ImageCropperHandle | null>(null)

  const handleConfirm = () => {
    const result = cropperRef.current?.getResult()
    if (result) onConfirm(result)
  }

  const handleCancel = () => {
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{t("consumption.imageCropTitle")}</DialogTitle>
          <DialogDescription>{t("consumption.imageCropDesc", { defaultValue: "Selecciona el área a recortar" })}</DialogDescription>
        </DialogHeader>
        <div className="relative h-[500px] w-full rounded-lg overflow-hidden">
          <ImageCropper ref={cropperRef} src={src} />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={handleCancel}>
            {t("common.cancel")}
          </Button>
          <Button type="button" onClick={handleConfirm}>
            {t("consumption.imageCropConfirm")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export default ImageCropDialog