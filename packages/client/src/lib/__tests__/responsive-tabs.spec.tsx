import { describe, expect, it, vi, beforeEach, afterEach } from "vitest"
import { createRoot } from "react-dom/client"
import { act } from "react"

import { ResponsiveTabs } from "@/components/ui/responsive-tabs"

class MockResizeObserver {
  callback: ResizeObserverCallback
  constructor(callback: ResizeObserverCallback) {
    this.callback = callback
  }
  observe() {
    this.callback([], this as unknown as ResizeObserver)
  }
  unobserve() {}
  disconnect() {}
}

beforeEach(() => {
  vi.stubGlobal("ResizeObserver", MockResizeObserver)
  vi.spyOn(HTMLElement.prototype, "getBoundingClientRect").mockImplementation(function (this: HTMLElement) {
    if (this.hasAttribute?.("data-measure-tab")) {
      return { width: 100, height: 32, top: 0, left: 0, bottom: 32, right: 100, x: 0, y: 0, toJSON: () => ({}) } as DOMRect
    }
    if (this.hasAttribute?.("data-measure-more")) {
      return { width: 96, height: 32, top: 0, left: 0, bottom: 32, right: 96, x: 0, y: 0, toJSON: () => ({}) } as DOMRect
    }
    if (this.getAttribute?.("role") === "tablist") {
      return { width: 200, height: 40, top: 0, left: 0, bottom: 40, right: 200, x: 0, y: 0, toJSON: () => ({}) } as DOMRect
    }
    return { width: 0, height: 0, top: 0, left: 0, bottom: 0, right: 0, x: 0, y: 0, toJSON: () => ({}) } as DOMRect
  })
})

afterEach(() => {
  vi.restoreAllMocks()
})

function renderTabs(props: Parameters<typeof ResponsiveTabs>[0]) {
  const container = document.createElement("div")
  document.body.appendChild(container)
  const root = createRoot(container)
  act(() => {
    root.render(<ResponsiveTabs {...props} />)
  })
  return { container, root }
}

describe("ResponsiveTabs", () => {
  it("renders tabs and content", () => {
    const { container } = renderTabs({
      tabs: [
        { value: "general", label: "General", content: "General content" },
        { value: "members", label: "Members", content: "Members content" },
      ],
    })

    expect(container.textContent).toContain("General")
    expect(container.textContent).toContain("Members")
    expect(container.textContent).toContain("General content")
  })

  it("moves overflow tabs into More", () => {
    const { container } = renderTabs({
      tabs: [
        { value: "general", label: "General", content: "General content" },
        { value: "members", label: "Members", content: "Members content" },
        { value: "billing", label: "Billing", content: "Billing content" },
      ],
    })

    expect(container.textContent).toContain("More")
  })

  it("does not render hidden tabs", () => {
    const { container } = renderTabs({
      tabs: [
        { value: "general", label: "General", content: "General content" },
        { value: "hidden", label: "Hidden", content: "Hidden content", hidden: true },
      ],
    })

    expect(container.textContent).not.toContain("Hidden")
  })

  it("renders disabled tab", () => {
    const { container } = renderTabs({
      tabs: [
        { value: "general", label: "General", content: "General content", disabled: true },
      ],
    })

    expect(container.textContent).toContain("General")
  })
})
