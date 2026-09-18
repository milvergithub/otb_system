import type { ReactNode } from "react"
import { EllipsisVertical } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useAuthStore } from "@/stores/auth"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export interface RowActionItem {
  label: ReactNode
  icon?: ReactNode
  onClick?: () => void
  destructive?: boolean
  disabled?: boolean
  permission?: string
}

interface RowActionsProps {
  items: RowActionItem[]
}

export function RowActions({ items }: RowActionsProps) {
  const hasPermission = useAuthStore((s) => s.hasPermission)
  const visibleItems = items.filter(
    (item) => !item.permission || hasPermission(item.permission),
  )

  if (visibleItems.length === 0) return null

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={<Button variant="ghost" size="icon" />}
      >
        <EllipsisVertical className="size-4" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {visibleItems.map((item, index) => (
          <DropdownMenuItem
            key={index}
            variant={item.destructive ? "destructive" : "default"}
            disabled={item.disabled}
            onClick={item.onClick}
          >
            {item.icon}
            {item.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
