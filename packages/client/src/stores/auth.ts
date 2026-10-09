import { create } from "zustand"
import { api, clearTokens, setTokens, getAccessToken } from "@/lib/api"
import { ApiPath } from "@/lib/apiPath"
import type { User, AuthResponse } from "@/lib/types"

interface AuthState {
  user: User | null
  loading: boolean
  loadUser: () => Promise<void>
  login: (email: string, password: string) => Promise<void>
  changePassword: (
    currentPassword: string,
    newPassword: string,
    newPasswordConfirmation: string,
  ) => Promise<void>
  applySession: (data: AuthResponse) => void
  logout: () => void
  hasPermission: (permission: string) => boolean
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  loading: true,

  loadUser: async () => {
    if (!getAccessToken()) {
      set({ loading: false })
      return
    }
    try {
      const res = await api.get<User>(ApiPath.Auth.ME)
      set({ user: res.data })
    } catch {
      clearTokens()
    } finally {
      set({ loading: false })
    }
  },

  login: async (email: string, password: string) => {
    const res = await api.post<AuthResponse>(ApiPath.Auth.LOGIN, { email, password })
    get().applySession(res.data)
  },

  changePassword: async (
    currentPassword,
    newPassword,
    newPasswordConfirmation,
  ) => {
    // The server reissues both tokens here so the must-change claim clears
    // straight away instead of surviving until the old access token expires.
    const res = await api.post<AuthResponse>(ApiPath.Auth.CHANGE_PASSWORD, {
      currentPassword,
      newPassword,
      newPasswordConfirmation,
    })
    get().applySession(res.data)
  },

  applySession: (data: AuthResponse) => {
    setTokens(data.accessToken, data.refreshToken)
    set({ user: data.user, loading: false })
  },

  logout: () => {
    clearTokens()
    set({ user: null })
    window.location.href = "/login"
  },

  hasPermission: (permission: string) => {
    const { user } = get()
    if (!user) return false
    if (user.role === "admin") return true
    return user.permissions?.includes(permission) ?? false
  },
}))
