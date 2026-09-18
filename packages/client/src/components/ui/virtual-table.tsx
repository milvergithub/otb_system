import {
  useCallback,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react"
import {
  Table,
  TableBody,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { cn } from "@/lib/utils"

interface VirtualTableProps<T> {
  data: T[]
  estimateSize?: number
  overscan?: number
  renderHeader: () => ReactNode
  renderRow: (item: T, index: number) => ReactNode
  onRowClick?: (item: T) => void
  emptyMessage?: string
  height?: number | string
}

function findStartIndex(offsets: number[], target: number): number {
  let lo = 0
  let hi = offsets.length - 1
  while (lo < hi) {
    const mid = (lo + hi) >> 1
    if (offsets[mid] <= target) {
      lo = mid + 1
    } else {
      hi = mid
    }
  }
  return Math.max(0, lo - 1)
}

export function VirtualTable<T>({
  data,
  estimateSize = 48,
  overscan = 12,
  renderHeader,
  renderRow,
  onRowClick,
  emptyMessage,
  height = 600,
}: VirtualTableProps<T>) {
  const containerRef = useRef<HTMLDivElement>(null)
  const rowRefsRef = useRef<Map<number, HTMLTableRowElement>>(new Map())
  const [heights, setHeights] = useState<number[]>([])
  const [range, setRange] = useState(() => ({
    start: 0,
    end: Math.min(data.length, overscan * 2),
  }))

  const offsets = useMemo(() => {
    const result = new Array<number>(data.length + 1).fill(0)
    let sum = 0
    for (let i = 0; i < data.length; i++) {
      sum += heights[i] ?? estimateSize
      result[i + 1] = sum
    }
    return result
  }, [data.length, heights, estimateSize])

  const updateRange = useCallback(() => {
    const el = containerRef.current
    if (!el) return
    const viewHeight = el.clientHeight
    const scrollTop = el.scrollTop
    const totalSize = offsets[data.length]
    const bottom = Math.min(scrollTop + viewHeight, totalSize)
    const nextStart = Math.max(0, findStartIndex(offsets, scrollTop) - overscan)
    const nextEnd = Math.min(data.length, findStartIndex(offsets, bottom) + overscan)
    setRange((prev) =>
      prev.start === nextStart && prev.end === nextEnd
        ? prev
        : { start: nextStart, end: nextEnd }
    )
  }, [offsets, data.length, overscan])

  useLayoutEffect(() => {
    const el = containerRef.current
    if (!el) return

    const onScroll = () => updateRange()
    el.addEventListener("scroll", onScroll, { passive: true })

    let resizeObserver: ResizeObserver | undefined
    if (typeof ResizeObserver !== "undefined") {
      resizeObserver = new ResizeObserver(updateRange)
      resizeObserver.observe(el)
    } else {
      const frame = requestAnimationFrame(updateRange)
      return () => {
        el.removeEventListener("scroll", onScroll)
        cancelAnimationFrame(frame)
      }
    }

    return () => {
      el.removeEventListener("scroll", onScroll)
      resizeObserver?.disconnect()
    }
  }, [updateRange])

  useLayoutEffect(() => {
    const next = heights.slice()
    let changed = false
    for (const [index, node] of rowRefsRef.current) {
      const h = node.offsetHeight
      if (
        h > 0 &&
        (next[index] === undefined || Math.abs(next[index] - h) > 1)
      ) {
        next[index] = h
        changed = true
      }
    }
    if (next.length > data.length) {
      next.length = data.length
      changed = true
    }
    if (changed) {
      const frame = requestAnimationFrame(() => setHeights(next))
      return () => cancelAnimationFrame(frame)
    }
  }, [data.length, heights])

  if (data.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        {emptyMessage ?? "No data"}
      </div>
    )
  }

  const totalSize = offsets[data.length]
  const visible = []
  for (let i = range.start; i < range.end; i++) {
    visible.push(i)
  }

  return (
    <div
      ref={containerRef}
      className="overflow-auto rounded-md border"
      style={{ height }}
    >
      <Table>
        <TableHeader className="sticky top-0 z-10 bg-background">
          {renderHeader()}
        </TableHeader>
        <TableBody>
          {range.start > 0 && (
            <TableRow
              aria-hidden="true"
              style={{ height: `${offsets[range.start]}px` }}
            >
              <td colSpan={999} className="p-0" />
            </TableRow>
          )}
          {visible.map((index) => {
            const item = data[index]
            return (
              <TableRow
                key={index}
                data-index={index}
                ref={(node) => {
                  if (node) rowRefsRef.current.set(index, node)
                  else rowRefsRef.current.delete(index)
                }}
                onClick={onRowClick ? () => onRowClick(item) : undefined}
                className={cn(onRowClick && "cursor-pointer hover:bg-muted/50")}
              >
                {renderRow(item, index)}
              </TableRow>
            )
          })}
          <TableRow
            aria-hidden="true"
            style={{
              height: `${Math.max(0, totalSize - offsets[range.end])}px`,
            }}
          >
            <td colSpan={999} className="p-0" />
          </TableRow>
        </TableBody>
      </Table>
    </div>
  )
}