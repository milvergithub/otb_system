import { useCallback, useEffect, useState } from "react"

export interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[]
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>
}

const DISMISSED_KEY = "otb_pwa_install_dismissed"

function isIosDevice(): boolean {
  if (typeof navigator === "undefined") return false
  if (/iphone|ipad|ipod/i.test(navigator.userAgent)) return true
  return navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1
}

function isStandaloneMode(): boolean {
  if (typeof window === "undefined") return false
  if (window.matchMedia("(display-mode: standalone)").matches) return true
  if (
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  )
    return true
  return document.referrer.startsWith("android-app://")
}

export function usePwaInstall() {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null)
  const [installed, setInstalled] = useState(() => isStandaloneMode())
  const [dismissed, setDismissed] = useState(() => {
    try {
      return localStorage.getItem(DISMISSED_KEY) === "1"
    } catch {
      return false
    }
  })
  const [isIOS] = useState(() => isIosDevice())

  useEffect(() => {
    const onBeforeInstall = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
    }
    const onInstalled = () => {
      setInstalled(true)
      setDeferredPrompt(null)
    }
    window.addEventListener("beforeinstallprompt", onBeforeInstall)
    window.addEventListener("appinstalled", onInstalled)
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall)
      window.removeEventListener("appinstalled", onInstalled)
    }
  }, [])

  const promptInstall = useCallback(async () => {
    if (!deferredPrompt) return false
    await deferredPrompt.prompt()
    const choice = await deferredPrompt.userChoice
    if (choice.outcome === "accepted") setInstalled(true)
    setDeferredPrompt(null)
    return choice.outcome === "accepted"
  }, [deferredPrompt])

  const dismissForever = useCallback(() => {
    try {
      localStorage.setItem(DISMISSED_KEY, "1")
    } catch {
      // storage unavailable, dismiss for this session only
    }
    setDismissed(true)
  }, [])

  return {
    canInstall: deferredPrompt !== null,
    isIOS,
    installed,
    dismissed,
    promptInstall,
    dismissForever,
  }
}
