import { useId, useMemo, useRef, useState } from "react"
import { useTranslation } from "react-i18next"
import { MoreVertical } from "lucide-react"
import { Tabs as TabsPrimitive } from "@base-ui/react/tabs"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { TabsContent, TabsTrigger } from "@/components/ui/tabs"
import { useResponsiveTabs } from "@/hooks/use-responsive-tabs"

export interface ResponsiveTab {
  value: string
  label: React.ReactNode
  content: React.ReactNode
  icon?: React.ReactNode
  badge?: React.ReactNode
  disabled?: boolean
  hidden?: boolean
  className?: string
}

export interface ResponsiveTabsProps {
  tabs: ResponsiveTab[]
  value?: string
  defaultValue?: string
  onValueChange?: (value: string) => void
  className?: string
  listClassName?: string
  contentClassName?: string
  moreLabel?: string
  "aria-label"?: string
}

export function ResponsiveTabs({
  tabs,
  value,
  defaultValue,
  onValueChange,
  className,
  listClassName,
  contentClassName,
  moreLabel,
  "aria-label": ariaLabel,
}: ResponsiveTabsProps) {
  const { t } = useTranslation()
  const generatedId = useId()
  const moreButtonRef = useRef<HTMLButtonElement | null>(null)

  const visibleTabs = useMemo(() => tabs.filter((tab) => !tab.hidden), [tabs])
  const enabledTabs = useMemo(
    () => visibleTabs.filter((tab) => !tab.disabled),
    [visibleTabs],
  )

  const firstEnabled = enabledTabs[0]?.value
  const [internalValue, setInternalValue] = useState(
    defaultValue ?? firstEnabled ?? visibleTabs[0]?.value ?? "",
  )

  const isControlled = value !== undefined
  const activeValue = isControlled ? value! : internalValue

  const handleValueChange = (next: string) => {
    if (!isControlled) setInternalValue(next)
    onValueChange?.(next)
  }

  if (
    activeValue &&
    !visibleTabs.some((tab) => tab.value === activeValue) &&
    firstEnabled
  ) {
    handleValueChange(firstEnabled)
  }

  const tabValues = visibleTabs.map((tab) => tab.value)
  const { visibleValues, containerRef, measureRef } = useResponsiveTabs(
    tabValues,
    activeValue,
    96,
  )

  const visibleSet = new Set(visibleValues)
  const overflowTabs = visibleTabs.filter((tab) => !visibleSet.has(tab.value))

  return (
    <TabsPrimitive.Root
      value={activeValue}
      onValueChange={(next) => handleValueChange(String(next))}
      className={cn("flex w-full flex-col gap-2", className)}
    >
      <TabsPrimitive.List
        ref={containerRef}
        aria-label={ariaLabel}
        className={cn(
          "relative flex w-full items-center gap-2 overflow-hidden rounded-full border-2 border-border bg-background p-1",
          listClassName,
        )}
      >
        {visibleValues.map((tabValue) => {
          const tab = visibleTabs.find((item) => item.value === tabValue)
          if (!tab) return null
          return (
            <TabsTrigger
              key={tab.value}
              value={tab.value}
              disabled={tab.disabled}
              id={`${generatedId}-tab-${tab.value}`}
              className={cn("shrink-0", tab.className)}
            >
              {tab.icon}
              {tab.label}
              {tab.badge}
            </TabsTrigger>
          )
        })}

        {overflowTabs.length > 0 ? (
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  ref={moreButtonRef}
                  variant="outline"
                  size="icon"
                  className="rounded-full"
                />
              }
            >
              <MoreVertical className="size-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-48">
              {overflowTabs.map((tab) => (
                <DropdownMenuItem
                  key={tab.value}
                  disabled={tab.disabled}
                  onClick={() => handleValueChange(tab.value)}
                  className={cn(
                    "flex items-center gap-2",
                    activeValue === tab.value && "font-medium",
                  )}
                >
                  {tab.icon}
                  <span className="flex-1">{tab.label}</span>
                  {tab.badge}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null}

        <div
          ref={measureRef}
          aria-hidden="true"
          className="pointer-events-none absolute left-0 top-0 flex items-center gap-2"
          style={{ visibility: "hidden", width: "max-content" }}
        >
          {visibleTabs.map((tab) => (
            <button
              key={tab.value}
              data-measure-tab
              type="button"
              className={cn(
                "inline-flex h-8 shrink-0 items-center justify-center gap-2 rounded-full px-4 text-sm font-medium",
                tab.className,
              )}
            >
              {tab.icon}
              {tab.label}
              {tab.badge}
            </button>
          ))}
          <button
            data-measure-more
            type="button"
            className="inline-flex h-8 shrink-0 items-center justify-center gap-2 rounded-full border-2 border-border bg-background px-3 text-sm font-medium"
          >
            <MoreVertical className="size-4" />
          </button>
        </div>
      </TabsPrimitive.List>

      {visibleTabs.map((tab) => (
        <TabsContent
          key={tab.value}
          value={tab.value}
          id={`${generatedId}-panel-${tab.value}`}
          className={contentClassName}
        >
          {tab.content}
        </TabsContent>
      ))}
    </TabsPrimitive.Root>
  )
}

