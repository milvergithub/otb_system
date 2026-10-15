import { useTranslation } from "react-i18next"
import { ChevronDown, ChevronUp, Loader2, Navigation, X } from "lucide-react"
import type { Meter } from "@/lib/types"
import type { RouteLeg } from "@/lib/osrm"
import { formatDistance } from "@/lib/utils/geo"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { cn } from "@/lib/utils"

interface MetersRoutePanelProps {
  stops: Meter[]
  legs: RouteLeg[]
  activeIndex: number
  visited: Set<string>
  loading: boolean
  totalDistance: number
  onSelect: (index: number) => void
  onToggleVisited: (id: string) => void
  onNext: () => void
  onClose: () => void
}

export default function MetersRoutePanel({
  stops,
  legs,
  activeIndex,
  visited,
  loading,
  totalDistance,
  onSelect,
  onToggleVisited,
  onNext,
  onClose,
}: MetersRoutePanelProps) {
  const { t } = useTranslation()

  return (
    <Card className="absolute bottom-4 left-4 z-[1000] flex max-h-[55%] w-80 flex-col overflow-hidden p-0 shadow-lg">
      <div className="flex items-center justify-between gap-2 border-b px-3 py-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">
            {t("meters.route.title")}
          </p>
          <p className="truncate text-xs text-muted-foreground">
            {loading
              ? t("meters.route.loading")
              : t("meters.route.summary", {
                  count: stops.length,
                  distance: formatDistance(totalDistance),
                })}
          </p>
        </div>
        <Button
          type="button"
          size="icon-sm"
          variant="ghost"
          onClick={onClose}
          title={t("meters.route.end")}
          aria-label={t("meters.route.end")}
        >
          <X />
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 px-3 py-6 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" />
          {t("meters.route.loading")}
        </div>
      ) : (
        <ul className="divide-y overflow-y-auto">
          {stops.map((stop, index) => {
            const isActive = index === activeIndex
            const isVisited = visited.has(stop.id)
            return (
              <li key={stop.id}>
                <div
                  className={cn(
                    "flex items-start gap-2 px-3 py-2 transition-colors",
                    isActive && "bg-primary/10",
                  )}
                >
                  <button
                    type="button"
                    className="flex min-w-0 flex-1 items-start gap-2 text-left"
                    onClick={() => onSelect(index)}
                  >
                    <span
                      className={cn(
                        "mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white",
                        isVisited ? "bg-green-600" : "bg-blue-700",
                      )}
                    >
                      {index + 1}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate font-mono text-sm font-medium">
                        {stop.code}
                      </span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {stop.address || "—"}
                      </span>
                      {legs[index] ? (
                        <span className="mt-0.5 inline-flex items-center gap-1 text-xs text-primary">
                          <Navigation className="size-3" />
                          {formatDistance(legs[index].distance)}
                        </span>
                      ) : null}
                    </span>
                  </button>
                  <Checkbox
                    checked={isVisited}
                    onCheckedChange={() => onToggleVisited(stop.id)}
                    aria-label={t("meters.route.visited")}
                  />
                </div>
              </li>
            )
          })}
        </ul>
      )}

      <div className="flex items-center justify-between gap-2 border-t px-3 py-2">
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={loading || activeIndex <= 0}
          onClick={() => onSelect(activeIndex - 1)}
        >
          <ChevronUp />
          {t("meters.route.previous")}
        </Button>
        <Button type="button" size="sm" disabled={loading} onClick={onNext}>
          {t("meters.route.next")}
          <ChevronDown />
        </Button>
      </div>
    </Card>
  )
}
