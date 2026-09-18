import { useEffect } from "react"
import { useAuthStore } from "@/stores/auth"

export function useAuth() {
  const user = useAuthStore((s) => s.user)
  const loading = useAuthStore((s) => s.loading)
  const loadUser = useAuthStore((s) => s.loadUser)
  const login = useAuthStore((s) => s.login)
  const logout = useAuthStore((s) => s.logout)
  const hasPermission = useAuthStore((s) => s.hasPermission)

  useEffect(() => {
    loadUser()
  }, [loadUser])

  return {
    user,
    loading,
    login,
    logout,
    hasPermission,
  }
}
