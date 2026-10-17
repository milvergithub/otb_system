import { useCallback, useLayoutEffect, useRef, useState } from "react"

export interface ResponsiveTabMeasure {
  value: string
  width: number
}

export interface UseResponsiveTabsResult {
  visibleValues: string[]
  containerRef: (node: HTMLDivElement | null) => void
  measureRef: (node: HTMLDivElement | null) => void
}

const TOLERANCE = 1

export function useResponsiveTabs(
  tabValues: string[],
  activeValue: string,
  moreWidth: number,
): UseResponsiveTabsResult {
  const containerNodeRef = useRef<HTMLDivElement | null>(null)
  const measureNodeRef = useRef<HTMLDivElement | null>(null)
  const [containerRefState, setContainerRefState] = useState<HTMLDivElement | null>(null)
  const [measureRefState, setMeasureRefState] = useState<HTMLDivElement | null>(null)
  const [visibleValues, setVisibleValues] = useState<string[]>(tabValues)

  const containerRef = useCallback((node: HTMLDivElement | null) => {
    containerNodeRef.current = node
    setContainerRefState(node)
  }, [])

  const measureRef = useCallback((node: HTMLDivElement | null) => {
    measureNodeRef.current = node
    setMeasureRefState(node)
  }, [])

  const recalc = useCallback(() => {
    const container = containerNodeRef.current
    const measure = measureNodeRef.current
    if (!container || !measure) return

    const available = container.getBoundingClientRect().width
    const tabEls = Array.from(
      measure.querySelectorAll<HTMLElement>("[data-measure-tab]"),
    )
    const widths = tabEls.map((el) => el.getBoundingClientRect().width)
    const gap = 8

    const allWidth =
      widths.reduce((sum, width) => sum + width, 0) +
      gap * Math.max(0, widths.length - 1)

    let nextVisible: string[]
    if (widths.length === 0) {
      nextVisible = []
    } else if (allWidth <= available + TOLERANCE) {
      nextVisible = [...tabValues]
    } else {
      const target = available - moreWidth - gap
      let used = 0
      let count = 0
      for (let i = 0; i < widths.length; i += 1) {
        const next = used + (i > 0 ? gap : 0) + widths[i]
        if (next <= target + TOLERANCE) {
          used = next
          count += 1
        } else {
          break
        }
      }

      if (count === 0) {
        nextVisible = []
      } else {
        nextVisible = tabValues.slice(0, count)
        const activeIndex = tabValues.indexOf(activeValue)
        const lastVisibleIndex = tabValues.indexOf(nextVisible[nextVisible.length - 1])
        if (
          activeIndex > lastVisibleIndex &&
          activeIndex >= 0 &&
          lastVisibleIndex >= 0
        ) {
          const activeWidth = widths[activeIndex]
          const lastWidth = widths[lastVisibleIndex]
          if (activeWidth <= lastWidth + TOLERANCE) {
            nextVisible[nextVisible.length - 1] = activeValue
          }
        }
      }
    }

    setVisibleValues((prev) => {
      if (
        prev.length === nextVisible.length &&
        prev.every((value, index) => value === nextVisible[index])
      ) {
        return prev
      }
      return nextVisible
    })
  }, [activeValue, moreWidth, tabValues])

  useLayoutEffect(() => {
    recalc()
  }, [recalc, containerRefState, measureRefState, tabValues])

  useLayoutEffect(() => {
    const container = containerNodeRef.current
    const measure = measureNodeRef.current
    if (!container) return

    const observer = new ResizeObserver(() => {
      window.requestAnimationFrame(recalc)
    })
    observer.observe(container)
    if (measure) observer.observe(measure)

    const fonts = (document as Document & { fonts?: { ready: Promise<unknown> } }).fonts
    fonts?.ready.then(() => recalc()).catch(() => undefined)

    window.addEventListener("resize", recalc)
    return () => {
      observer.disconnect()
      window.removeEventListener("resize", recalc)
    }
  }, [recalc])

  return { visibleValues, containerRef, measureRef }
}
