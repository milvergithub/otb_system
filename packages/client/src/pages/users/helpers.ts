import type { UserWithRoles } from "@/lib/types"

export function userAccessor(user: UserWithRoles, key: string): unknown {
  switch (key) {
    case "full_name":
      return user.full_name
    case "email":
      return user.email
    case "is_active":
      return user.is_active
    case "created_at":
      return user.created_at
    case "roles":
      return user.roles?.map((r) => r.name).join(", ") ?? ""
    default:
      return null
  }
}
