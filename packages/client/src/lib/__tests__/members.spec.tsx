import { act } from "react"
import { createRoot, type Root } from "react-dom/client"
import { QueryClient, QueryClientProvider, useQuery } from "@tanstack/react-query"
import type { AxiosAdapter, InternalAxiosRequestConfig } from "axios"
import { afterEach, beforeEach, describe, expect, it } from "vitest"

import { api } from "@/lib/api"
import { queryKeys } from "@/lib/utils/query"
import { ApiPath } from "@/lib/apiPath"
import {
  useDeleteMember,
  useRestoreMember,
  useSearchMembers,
} from "@/hooks/members"

/** Records what the interceptor chain actually produced for each request. */
function recordingAdapter() {
  const calls: InternalAxiosRequestConfig[] = []
  const adapter: AxiosAdapter = async (config) => {
    calls.push(config)
    return {
      data: { items: [], total: 0, page: 1, limit: 10, totalPages: 0 },
      status: 200,
      statusText: "OK",
      headers: {},
      config,
    }
  }
  return { calls, adapter }
}

interface EmptyPage<T> {
  items: T[]
  total: number
  page: number
  limit: number
  totalPages: number
}

interface MountedHook<T> {
  root: Root
  container: HTMLDivElement
  current: () => T
}

let originalAdapter: AxiosAdapter | undefined
const mounted: Array<{ root: Root; container: HTMLDivElement }> = []

beforeEach(() => {
  originalAdapter = api.defaults.adapter as unknown as AxiosAdapter | undefined
  document.body.innerHTML = ""
})

afterEach(() => {
  for (const { root, container } of mounted.splice(0)) {
    act(() => root.unmount())
    container.remove()
  }
  api.defaults.adapter = originalAdapter
})

// React 19 requires the act environment flag to test with `act`.
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

/** Renders a component that calls the hook and reports its latest value. */
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

async function flush() {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 0))
  })
}

describe("useSearchMembers deleted-members status", () => {
  it("sends no status param for the default active list", async () => {
    const { calls, adapter } = recordingAdapter()
    api.defaults.adapter = adapter

    mountHook(makeQueryClient(), () =>
      useSearchMembers({ page: 1 }),
    )
    await flush()

    const config = calls.find((c) => c.url === "/members")
    expect(config).toBeDefined()
    expect((config!.params as Record<string, unknown>).status).toBeUndefined()
  })

  it("sends status=deleted and keys the query with the status dimension", async () => {
    const { calls, adapter } = recordingAdapter()
    api.defaults.adapter = adapter
    const queryClient = makeQueryClient()

    const hook = mountHook(queryClient, () =>
      useSearchMembers({ page: 2, search: "juan", status: "deleted" }),
    )
    // Wait until the query resolves and re-renders with data.
    await act(async () => {
      for (let i = 0; i < 50 && !hook.current().data; i++) {
        await new Promise((resolve) => setTimeout(resolve, 0))
      }
    })

    const config = calls.find((c) => c.url === "/members")
    expect((config!.params as Record<string, unknown>).status).toBe("deleted")
    // The key must include the status so switching tabs does not reuse data.
    expect(queryClient.getQueryState(queryKeys.members.list(2, "juan", "", "", "", "deleted"))).toBeDefined()
    expect(hook.current().data).toMatchObject({
      items: [],
      total: 0,
      page: 1,
      limit: 10,
      totalPages: 0,
    } satisfies EmptyPage<unknown>)
  })

  it("sends status=all for the combined view", async () => {
    const { calls, adapter } = recordingAdapter()
    api.defaults.adapter = adapter

    mountHook(makeQueryClient(), () => useSearchMembers({ page: 1, status: "all" }))
    await flush()

    const config = calls.find((c) => c.url === "/members")
    expect((config!.params as Record<string, unknown>).status).toBe("all")
  })
})

describe("useRestoreMember", () => {
  it("PATCHes the restore endpoint and refetches members, dashboard and member types", async () => {
    const { calls, adapter } = recordingAdapter()
    api.defaults.adapter = adapter
    const queryClient = makeQueryClient()

    // Active observers under the keys the mutation invalidates.
    function Observers() {
      useQuery({
        queryKey: queryKeys.members.all,
        queryFn: () => api.get("/members").then((r) => r.data as EmptyPage<unknown>),
      })
      useQuery({
        queryKey: queryKeys.dashboard,
        queryFn: () => api.get("/dashboard").then((r) => r.data),
      })
      useQuery({
        queryKey: queryKeys.memberTypes.all,
        queryFn: () => api.get("/member-types").then((r) => r.data),
      })
      return null
    }
    const observers = mountHook(queryClient, () => {
      Observers()
      return null
    })
    await flush()

    const hook = mountHook(queryClient, () => useRestoreMember())
    expect(hook.current().isIdle).toBe(true)

    await act(async () => {
      hook.current().mutate("member-1")
      await new Promise((resolve) => setTimeout(resolve, 0))
    })
    await flush()

    const patch = calls.find((c) => c.method?.toUpperCase() === "PATCH")
    expect(patch!.url).toBe(ApiPath.Members.RESTORE("member-1"))

    const membersHits = calls.filter((c) => c.url === "/members")
    const dashboardHits = calls.filter((c) => c.url === "/dashboard")
    const memberTypesHits = calls.filter((c) => c.url === "/member-types")
    expect(membersHits).toHaveLength(2)
    expect(dashboardHits).toHaveLength(2)
    expect(memberTypesHits).toHaveLength(2)
    observers.root.unmount()
  })
})

describe("useDeleteMember", () => {
  it("DELETEs the member endpoint", async () => {
    const { calls, adapter } = recordingAdapter()
    api.defaults.adapter = adapter
    const queryClient = makeQueryClient()

    const hook = mountHook(queryClient, () => useDeleteMember())

    await act(async () => {
      hook.current().mutate("member-2")
      await new Promise((resolve) => setTimeout(resolve, 0))
    })
    await flush()

    const del = calls.find((c) => c.method?.toUpperCase() === "DELETE")
    expect(del!.url).toBe(ApiPath.Members.ONE("member-2"))
  })
})