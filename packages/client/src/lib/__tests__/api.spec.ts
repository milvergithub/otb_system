import type { AxiosAdapter, InternalAxiosRequestConfig } from "axios"
import { QueryClient } from "@tanstack/react-query"
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest"

import i18n, { SUPPORTED_LANGUAGES } from "@/lib/i18n"
import { api, currentLanguage, getApiErrorMessage, setTokens, clearTokens } from "@/lib/api"

/** Records what the interceptor chain actually produced for each request. */
function recordingAdapter() {
  const calls: InternalAxiosRequestConfig[] = []
  const adapter: AxiosAdapter = async (config) => {
    calls.push(config)
    return {
      data: { ok: true },
      status: 200,
      statusText: "OK",
      headers: {},
      config,
    }
  }
  return { calls, adapter }
}

function axiosError(data: unknown, status = 400) {
  return {
    isAxiosError: true,
    message: `Request failed with status code ${status}`,
    response: { data, status },
  }
}

let originalAdapter: AxiosAdapter | undefined

beforeAll(async () => {
  if (!i18n.isInitialized) {
    await new Promise<void>((resolve) => i18n.on("initialized", () => resolve()))
  }
})

beforeEach(() => {
  originalAdapter = api.defaults.adapter as unknown as AxiosAdapter | undefined
  clearTokens()
})

afterEach(() => {
  api.defaults.adapter = originalAdapter
  clearTokens()
  return i18n.changeLanguage("en")
})

describe("Accept-Language negotiation", () => {
  it("sends the selected language on every request (scenario 1)", async () => {
    await i18n.changeLanguage("es")
    const { calls, adapter } = recordingAdapter()
    api.defaults.adapter = adapter

    await api.get("/members")

    expect(calls).toHaveLength(1)
    expect(calls[0].headers["Accept-Language"]).toBe("es")
  })

  it("follows a language change made during the session (scenario 2)", async () => {
    const { calls, adapter } = recordingAdapter()
    api.defaults.adapter = adapter

    await i18n.changeLanguage("es")
    await api.get("/members")
    await i18n.changeLanguage("en")
    await api.get("/members")

    expect(calls.map((c) => c.headers["Accept-Language"])).toEqual(["es", "en"])
  })

  it("collapses regional tags to the codes the API declares", async () => {
    const { calls, adapter } = recordingAdapter()
    api.defaults.adapter = adapter

    await i18n.changeLanguage("es-BO")
    await api.get("/members")

    expect(calls[0].headers["Accept-Language"]).toBe("es")
    expect(SUPPORTED_LANGUAGES.map((l) => l.code)).toContain(currentLanguage())
  })

  it("keeps the Authorization header alongside the language (scenario 7 setup)", async () => {
    setTokens("access-token", "refresh-token")
    const { calls, adapter } = recordingAdapter()
    api.defaults.adapter = adapter

    await api.get("/members")

    expect(calls[0].headers.Authorization).toBe("Bearer access-token")
    expect(calls[0].headers["Accept-Language"]).toBeTruthy()
  })

  it("applies to TanStack Query requests, which share the axios instance (scenario 7)", async () => {
    await i18n.changeLanguage("es")
    const { calls, adapter } = recordingAdapter()
    api.defaults.adapter = adapter
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })

    await queryClient.fetchQuery({
      queryKey: ["members"],
      queryFn: () => api.get("/members"),
    })

    expect(calls[0].headers["Accept-Language"]).toBe("es")
  })

  it("resends the current language when a 401 is retried after refresh", async () => {
    const { calls, adapter } = recordingAdapter()
    let firstCall = true
    api.defaults.adapter = (async (config) => {
      calls.push(config)
      if (firstCall) {
        firstCall = false
        return Promise.reject(
          Object.assign(new Error("unauthorized"), {
            isAxiosError: true,
            config,
            response: { status: 401, data: {} },
          }),
        )
      }
      return { data: { ok: true }, status: 200, statusText: "OK", headers: {}, config }
    }) as AxiosAdapter
    // The refresh call itself bypasses the interceptors.
    const postSpy = vi
      .spyOn(
        (await import("axios")).default,
        "post",
      )
      .mockResolvedValue({
        data: { accessToken: "new-access", refreshToken: "new-refresh" },
      } as never)

    setTokens("stale-access", "refresh-token")
    await i18n.changeLanguage("es")

    await api.get("/members")

    expect(calls).toHaveLength(2)
    expect(calls[1].headers["Accept-Language"]).toBe("es")
    expect(calls[1].headers.Authorization).toBe("Bearer new-access")
    postSpy.mockRestore()
  })

  it("exposes headers for the calls that bypass the instance (raw fetch)", async () => {
    await i18n.changeLanguage("es")
    setTokens("access-token", "refresh-token")

    const { authHeaders } = await import("@/lib/api")
    expect(authHeaders()).toEqual({
      Authorization: "Bearer access-token",
      "Accept-Language": "es",
    })
  })
})

describe("getApiErrorMessage", () => {
  it("shows a coded message verbatim, already localized by the API (scenario 4)", async () => {
    const error = axiosError(
      { statusCode: 404, error: "Not Found", code: "MEMBER_NOT_FOUND", message: "Socio no encontrado" },
      404,
    )

    expect(getApiErrorMessage(error)).toBe("Socio no encontrado")
  })

  it("does not re-translate a coded message even when it matches a legacy key (scenario 4)", async () => {
    // "Member not found" is in the legacy map; a coded response must bypass it.
    const error = axiosError(
      { statusCode: 404, code: "MEMBER_NOT_FOUND", message: "Member not found" },
      404,
    )

    await i18n.changeLanguage("es")
    expect(getApiErrorMessage(error)).toBe("Member not found")
  })

  it("renders a coded validation error once, joining the message list", async () => {
    const error = axiosError({
      statusCode: 400,
      code: "VALIDATION_ERROR",
      message: ["email debe ser un correo electrónico válido", "age debe ser un número entero"],
    })

    const rendered = getApiErrorMessage(error)
    expect(rendered).toBe(
      "email debe ser un correo electrónico válido, age debe ser un número entero",
    )
    expect(rendered).not.toContain("errors.")
  })

  it("still resolves uncoded responses through the legacy maps (scenario 6)", async () => {
    await i18n.changeLanguage("es")
    const error = axiosError({ statusCode: 404, message: "Member not found" }, 404)

    expect(getApiErrorMessage(error)).toBe("Socio no encontrado")
  })

  it("passes unknown uncoded messages through untouched", () => {
    const error = axiosError({ statusCode: 400, message: "Something bespoke" })

    expect(getApiErrorMessage(error)).toBe("Something bespoke")
  })

  it("falls back to the generic message when the body carries none", () => {
    expect(getApiErrorMessage(axiosError(undefined, 500))).toBe(
      "An unexpected error occurred",
    )
  })

  it("falls back to the generic message for non-HTTP failures", () => {
    expect(getApiErrorMessage(new Error("boom"))).toBe(
      "An unexpected error occurred",
    )
  })

  it("keeps the password-change code readable (branching contract)", () => {
    const error = axiosError(
      {
        statusCode: 403,
        error: "Forbidden",
        code: "PASSWORD_CHANGE_REQUIRED",
        message: "You must change your password to continue",
      },
      403,
    )

    expect(getApiErrorMessage(error)).toBe("You must change your password to continue")
  })
})
