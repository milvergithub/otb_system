import { useEffect, useRef, useState } from "react"
import { useTranslation } from "react-i18next"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import MeterLocationPicker from "./MeterLocationPicker"

interface MeterLocationDialogProps {
  open: boolean
  initialLatitude?: string
  initialLongitude?: string
  onConfirm: (lat: string, lng: string) => void
  onOpenChange: (open: boolean) => void
}

export default function MeterLocationDialog({
  open,
  initialLatitude,
  initialLongitude,
  onConfirm,
  onOpenChange,
}: MeterLocationDialogProps) {
  const { t } = useTranslation()
  const prevOpen = useRef(false)

  const [draftLat, setDraftLat] = useState(initialLatitude ?? "")
  const [draftLng, setDraftLng] = useState(initialLongitude ?? "")

  useEffect(() => {
    if (open && !prevOpen.current) {
      setDraftLat(initialLatitude ?? "")
      setDraftLng(initialLongitude ?? "")
    }
    prevOpen.current = open
  }, [open, initialLatitude, initialLongitude])

  const handleConfirm = () => {
    onConfirm(draftLat, draftLng)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{t("meters.location")}</DialogTitle>
          <DialogDescription>
            {t("meters.locationDialogHint")}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-7 text-xs"
              onClick={() => {
                navigator.geolocation.getCurrentPosition(
                  (pos) => {
                    setDraftLat(pos.coords.latitude.toFixed(8))
                    setDraftLng(pos.coords.longitude.toFixed(8))
                  },
                  () => {
                    toast.info(t("meters.locationDenied"), { duration: 4000 })
                  },
                )
              }}
            >
              {t("meters.useMyLocation")}
            </Button>
            {draftLat && draftLng && (
              <p className="text-xs text-muted-foreground">
                {draftLat}, {draftLng}
              </p>
            )}
          </div>
          <div className="overflow-hidden rounded-md border">
            <MeterLocationPicker
              latitude={draftLat}
              longitude={draftLng}
              onChange={(lat, lng) => {
                setDraftLat(lat)
                setDraftLng(lng)
              }}
            />
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            {t("common.cancel")}
          </Button>
          <Button type="button" onClick={handleConfirm}>
            {t("meters.confirmLocation")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
