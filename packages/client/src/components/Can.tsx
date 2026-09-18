import type { ReactNode } from "react"
import { useAuthStore } from "@/stores/auth"

export function Can({
  permission,
  fallback = null,
  children,
}: {
  permission: string
  fallback?: ReactNode
  children: ReactNode
}) {
  const allowed = useAuthStore((s) => s.hasPermission(permission))
  return allowed ? <>{children}</> : <>{fallback}</>
}

export default Can