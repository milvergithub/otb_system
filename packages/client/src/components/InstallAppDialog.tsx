import { useEffect, useRef, useState } from "react"
import { useTranslation } from "react-i18next"
import { Download, Plus, Share } from "lucide-react"
import { usePwaInstall } from "@/hooks/use-pwa-install"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

const AUTO_OPEN_DELAY_MS = 2500

export default function InstallAppDialog() {
  const { t } = useTranslation()
  const { canInstall, isIOS, installed, dismissed, promptInstall, dismissForever } =
    usePwaInstall()
  const [open, setOpen] = useState(false)
  const [installing, setInstalling] = useState(false)
  const autoOpened = useRef(false)

  useEffect(() => {
    if (installed || dismissed || autoOpened.current) return
    if (!canInstall && !isIOS) return
    const timer = setTimeout(() => {
      autoOpened.current = true
      setOpen(true)
    }, AUTO_OPEN_DELAY_MS)
    return () => clearTimeout(timer)
  }, [installed, dismissed, canInstall, isIOS])

  async function handleInstall() {
    setInstalling(true)
    await promptInstall()
    setInstalling(false)
    setOpen(false)
  }

  function handleNever() {
    dismissForever()
    setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !next && setOpen(false)}>
      <DialogContent>
        <DialogHeader>
          <div className="flex items-center gap-3">
            <img
              src="/pwa-192x192.png"
              alt=""
              className="size-14 rounded-2xl"
            />
            <div>
              <DialogTitle>{t("pwa.title")}</DialogTitle>
              <DialogDescription>{t("pwa.description")}</DialogDescription>
            </div>
          </div>
        </DialogHeader>
        {isIOS && !canInstall ? (
          <ol className="space-y-2 text-sm">
            <li className="flex items-center gap-2">
              <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium">
                1
              </span>
              <span>
                {t("pwa.iosStep1")} <Share className="inline size-4" />
              </span>
            </li>
            <li className="flex items-center gap-2">
              <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium">
                2
              </span>
              <span>
                {t("pwa.iosStep2")} <Plus className="inline size-4" />
              </span>
            </li>
            <li className="flex items-center gap-2">
              <span className="flex size-5 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium">
                3
              </span>
              <span>{t("pwa.iosStep3")}</span>
            </li>
          </ol>
        ) : null}
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setOpen(false)}>
            {t("pwa.later")}
          </Button>
          <Button type="button" variant="ghost" onClick={handleNever}>
            {t("pwa.never")}
          </Button>
          {!isIOS || canInstall ? (
            <Button
              type="button"
              onClick={handleInstall}
              disabled={!canInstall || installing}
            >
              <Download className="size-4" />
              {installing ? t("pwa.installing") : t("pwa.install")}
            </Button>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
