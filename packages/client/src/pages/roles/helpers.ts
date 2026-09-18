import type { Role } from "@/lib/types"

export function roleAccessor(role: Role, key: string): unknown {
  switch (key) {
    case "name":
      return role.name
    case "description":
      return role.description ?? ""
    case "is_system":
      return role.is_system
    case "created_at":
      return role.created_at
    case "permissions":
      return role.permissions?.length ?? 0
    default:
      return null
  }
}
