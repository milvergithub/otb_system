import { act } from "react"
import { createRoot, type Root } from "react-dom/client"
import { QueryClient, QueryClientProvider, useQuery } from "@tanstack/react-query"
import type { AxiosAdapter, InternalAxiosRequestConfig } from "axios"
import { afterEach, beforeEach, describe, expect, it } from "vitest"

import { api } from "@/lib/api"
import { queryKeys } from "@/lib/utils/query"
import { ApiPath } from "@/lib/apiPath"
import type { PaymentMethodItem } from "@/lib/types"
import {
  useDeletePaymentMethod,
  usePaymentMethodMap,
  usePaymentMethods,
} from "@/hooks/paymentMethods"

const ITEMS: PaymentMethodItem[] = [
  {
    id: "pm-1",
    code: "cash",
    name: "Efectivo",
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
  },
  {
    id: "pm-2",
    code: "transfer",
    name: "Transferencia",
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
  },
]

/** Records what the interceptor chain actually produced for each request. */
function recordingAdapter(data: unknown) {
  const calls: InternalAxiosRequestConfig[] = []
  const adapter: AxiosAdapter = async (config) => {
    calls.push(config)
    const isDelete = config.method?.toUpperCase() === "DELETE"
    return {
      data: isDelete ? null : data,
      status: 200,
      statusText: "OK",
      headers: {},
      config,
    }
  }
  return { calls, adapter }
}

interface MountedHook<T> {
  root: Root
  container: HTMLDivElement
  current: () => T
}

let originalAdapter: AxiosAdapter | unknown
const mounted: Array<{ root: Root; container: HTMLDivElement }> = []

beforeEach(() => {
  originalAdapter = api.defaults.adapter
  document.body.innerHTML = ""
})

afterEach(() => {
  for (const { root, container } of mounted.splice(0)) {
    act(() => root.unmount())
    container.remove()
  }
  api.defaults.adapter = originalAdapter as never
})

// React 19 requires the act environment flag to test with `act`.
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

function mountHook<T>(
  queryClient: QueryClient,
  render: () => T,
): MountedHook<T> {
  const container = document.createElement("div")
  document.body.appendChild(container)
  const root = createRoot(container)
  let current!: T
  function Host() {
    current = render()
    return null
  }
  act(() => {
    root.render(
      <QueryClientProvider client={queryClient}>
        <Host />
      </QueryClientProvider>,
    )
  })
  mounted.push({ root, container })
  return { root, container, current: () => current }
}

function makeQueryClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false } } })
}

async function settle() {
  await act(async () => {
    for (let i = 0; i < 50; i++) {
      await new Promise((resolve) => setTimeout(resolve, 0))
    }
  })
}

describe("usePaymentMethods", () => {
  it("fetches the payment-methods endpoint", async () => {
    const { calls, adapter } = recordingAdapter(ITEMS)
    api.defaults.adapter = adapter

    const hook = mountHook(makeQueryClient(), () => usePaymentMethods())
    await settle()

    expect(calls.map((c) => c.url)).toContain(ApiPath.PaymentMethods.BASE)
    expect(hook.current().data).toHaveLength(2)
  })

  it("does not fetch when disabled", async () => {
    const { calls, adapter } = recordingAdapter(ITEMS)
    api.defaults.adapter = adapter

    mountHook(makeQueryClient(), () => usePaymentMethods(false))
    await settle()

    expect(calls).toHaveLength(0)
  })
})

describe("usePaymentMethodMap", () => {
  it("maps stored codes to their display names", async () => {
    const { adapter } = recordingAdapter(ITEMS)
    api.defaults.adapter = adapter

    const hook = mountHook(makeQueryClient(), () => usePaymentMethodMap())
    await settle()

    expect(hook.current().map).toEqual({
      cash: "Efectivo",
      transfer: "Transferencia",
    })
  })
})

describe("useDeletePaymentMethod", () => {
  it("DELETEs the payment-method endpoint and invalidates the list", async () => {
    const { calls, adapter } = recordingAdapter(ITEMS)
    api.defaults.adapter = adapter
    const queryClient = makeQueryClient()

    // Active observer under the key the mutation invalidates.
    function Observer() {
      useQuery({
        queryKey: queryKeys.paymentMethods.list,
        queryFn: () => api.get(ApiPath.PaymentMethods.BASE).then((r) => r.data),
      })
      return null
    }
    mountHook(queryClient, () => {
      Observer()
      return null
    })
    await settle()

    const hook = mountHook(queryClient, () => useDeletePaymentMethod())
    await act(async () => {
      hook.current().mutate("pm-1")
      await new Promise((resolve) => setTimeout(resolve, 0))
    })
    await settle()

    const del = calls.find((c) => c.method?.toUpperCase() === "DELETE")
    expect(del!.url).toBe(ApiPath.PaymentMethods.ONE("pm-1"))
    // The list is refetched after the invalidation.
    expect(calls.filter((c) => c.url === ApiPath.PaymentMethods.BASE)).toHaveLength(2)
  })
})
