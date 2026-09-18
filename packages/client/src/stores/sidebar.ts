import { create } from "zustand"
import { useIsMobile } from "@/hooks/use-mobile"

const SIDEBAR_COOKIE_NAME = "sidebar_state"
const SIDEBAR_COOKIE_MAX_AGE = 60 * 60 * 24 * 7
const SIDEBAR_KEYBOARD_SHORTCUT = "b"

interface SidebarState {
  open: boolean
  openMobile: boolean
  isMobile: boolean
  state: "expanded" | "collapsed"
  setOpen: (open: boolean) => void
  setOpenMobile: (open: boolean) => void
  toggleSidebar: () => void
  initKeyboardShortcut: () => () => void
}

export const useSidebarStore = create<SidebarState>((set, get) => ({
  open: true,
  openMobile: false,
  isMobile: false,
  state: "expanded",

  setOpen: (open: boolean) => {
    set({ open, state: open ? "expanded" : "collapsed" })
    document.cookie = `${SIDEBAR_COOKIE_NAME}=${open}; path=/; max-age=${SIDEBAR_COOKIE_MAX_AGE}`
  },

  setOpenMobile: (openMobile: boolean) => {
    set({ openMobile })
  },

  toggleSidebar: () => {
    const { isMobile, open, openMobile } = get()
    if (isMobile) {
      set({ openMobile: !openMobile })
    } else {
      const newOpen = !open
      set({ open: newOpen, state: newOpen ? "expanded" : "collapsed" })
      document.cookie = `${SIDEBAR_COOKIE_NAME}=${newOpen}; path=/; max-age=${SIDEBAR_COOKIE_MAX_AGE}`
    }
  },

  initKeyboardShortcut: () => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (
        event.key === SIDEBAR_KEYBOARD_SHORTCUT &&
        (event.metaKey || event.ctrlKey)
      ) {
        event.preventDefault()
        get().toggleSidebar()
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  },
}))

export function initSidebarFromCookie() {
  const cookie = document.cookie
    .split("; ")
    .find((row) => row.startsWith(`${SIDEBAR_COOKIE_NAME}=`))
  if (cookie) {
    const value = cookie.split("=")[1] === "true"
    useSidebarStore.setState({ open: value, state: value ? "expanded" : "collapsed" })
  }
}
