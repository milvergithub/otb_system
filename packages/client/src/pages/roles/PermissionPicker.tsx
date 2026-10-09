import { useMemo } from "react"
import { useTranslation } from "react-i18next"
import type { Permission } from "@/lib/types"
import { Badge } from "@/components/ui/badge"
import { Checkbox } from "@/components/ui/checkbox"
import { ScrollArea } from "@/components/ui/scroll-area"
import { RESOURCE_ORDER } from "./constants"

interface PermissionPickerProps {
  permissions: Permission[]
  value: string[]
  onChange: (ids: string[]) => void
}

export default function PermissionPicker({
  permissions,
  value,
  onChange,
}: PermissionPickerProps) {
  const { t } = useTranslation()

  const grouped = useMemo(() => {
    const byResource = new Map<string, Permission[]>()
    for (const perm of permissions) {
      const existing = byResource.get(perm.resource)
      if (existing) existing.push(perm)
      else byResource.set(perm.resource, [perm])
    }
    for (const list of byResource.values()) {
      list.sort((a, b) => a.action.localeCompare(b.action))
    }
    return [...byResource.entries()].sort(
      ([a], [b]) => resourceIndex(a) - resourceIndex(b),
    )
  }, [permissions])

  function resourceIndex(resource: string) {
    const index = RESOURCE_ORDER.indexOf(resource)
    return index === -1 ? RESOURCE_ORDER.length : index
  }

  function togglePermission(permissionId: string) {
    onChange(
      value.includes(permissionId)
        ? value.filter((id) => id !== permissionId)
        : [...value, permissionId],
    )
  }

  function toggleResourcePermissions(resourcePerms: Permission[]) {
    const allSelected =
      resourcePerms.length > 0 &&
      resourcePerms.every((p) => value.includes(p.id))
    const resourceIds = new Set(resourcePerms.map((p) => p.id))
    onChange(
      allSelected
        ? value.filter((id) => !resourceIds.has(id))
        : [...new Set([...value, ...resourceIds])],
    )
  }

  if (grouped.length === 0) return null

  return (
    <ScrollArea className="h-[300px] rounded-md border p-4">
      <div className="space-y-4">
        {grouped.map(([resource, resourcePerms]) => {
          const allSelected = resourcePerms.every((p) => value.includes(p.id))
          return (
            <div key={resource} className="space-y-2">
              <div className="flex items-center gap-3">
                <Checkbox
                  checked={allSelected}
                  onCheckedChange={() => toggleResourcePermissions(resourcePerms)}
                />
                <span className="text-sm font-semibold capitalize">
                  {t(`roles.resource.${resource}`, { defaultValue: resource })}
                </span>
              </div>
              <div className="ml-6 flex flex-wrap gap-2">
                {resourcePerms.map((perm) => (
                  <Badge
                    key={perm.id}
                    variant={value.includes(perm.id) ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => togglePermission(perm.id)}
                  >
                    {t(`roles.action.${perm.action}`, { defaultValue: perm.action })}
                  </Badge>
                ))}
              </div>
            </div>
          )
        })}
      </div>
    </ScrollArea>
  )
}