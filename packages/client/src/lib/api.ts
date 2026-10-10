import axios, {
  AxiosError,
  type InternalAxiosRequestConfig,
} from "axios"
import i18n from "@/lib/i18n"
import { PASSWORD_CHANGE_PATH } from "@/lib/password"

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001/api"

export const ACCESS_KEY = "otb_access_token"
export const REFRESH_KEY = "otb_refresh_token"

export const api = axios.create({
  baseURL: API_URL,
})

export function getAccessToken() {
  return localStorage.getItem(ACCESS_KEY)
}

export function setTokens(access: string, refresh: string) {
  localStorage.setItem(ACCESS_KEY, access)
  localStorage.setItem(REFRESH_KEY, refresh)
}

export function clearTokens() {
  localStorage.removeItem(ACCESS_KEY)
  localStorage.removeItem(REFRESH_KEY)
}

/**
 * The language the API should answer in for the current request.
 *
 * Read from the live i18next instance rather than `localStorage` so a
 * mid-session `changeLanguage` takes effect on the very next request instead of
 * waiting for a reload. `resolvedLanguage` already collapses `es-BO`/`en-US`
 * down to the codes the server declares (`supportedLngs` + `nonExplicitSupportedLngs`).
 */
export function currentLanguage(): string {
  return i18n.resolvedLanguage ?? i18n.language ?? "en"
}

/**
 * Headers for the rare calls that bypass the shared axios instance (raw
 * `fetch`, e.g. streaming an asset document to a new tab). Keeps auth and
 * language handling identical to `api`.
 */
export function authHeaders(): Record<string, string> {
  const token = getAccessToken()
  return {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    "Accept-Language": currentLanguage(),
  }
}

api.interceptors.request.use((config) => {
  const token = getAccessToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  // Tells the API which language to localize validation, business and
  // authorization errors in. Every request goes through this instance —
  // including all TanStack Query `queryFn`s — so no per-service wiring is needed.
  config.headers["Accept-Language"] = currentLanguage()
  return config
})

let refreshPromise: Promise<string> | null = null

interface RetryConfig extends InternalAxiosRequestConfig {
  _retry?: boolean
}

async function refreshAccessToken(): Promise<string> {
  const refreshToken = localStorage.getItem(REFRESH_KEY)
  if (!refreshToken) {
    throw new Error("No refresh token")
  }
  // Deliberately bypasses the `api` interceptors (no Authorization header, and
  // no 401-refresh loop), but still negotiates the error language.
  const res = await axios.post(
    `${API_URL}/auth/refresh`,
    { refreshToken },
    { headers: { "Accept-Language": currentLanguage() } },
  )
  const { accessToken, refreshToken: newRefresh } = res.data
  setTokens(accessToken, newRefresh)
  return accessToken
}

export const PASSWORD_CHANGE_REQUIRED_CODE = "PASSWORD_CHANGE_REQUIRED"

/** Server error codes the UI branches on (as opposed to just displaying). */
export const SETUP_ALREADY_COMPLETED_CODE = "SETUP_ALREADY_COMPLETED"

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as RetryConfig | undefined

    // Second line of defence behind the ProtectedRoute gate: catches deep
    // links and any request made with a token minted while the account still
    // held a temporary password.
    if (error.response?.status === 403 && isPasswordChangeRequired(error)) {
      if (!window.location.pathname.startsWith(PASSWORD_CHANGE_PATH)) {
        window.location.href = PASSWORD_CHANGE_PATH
      }
      return Promise.reject(error)
    }

    if (
      error.response?.status === 401 &&
      original &&
      !original._retry &&
      !original.url?.includes("/auth/login")
    ) {
      original._retry = true
      try {
        if (!refreshPromise) {
          refreshPromise = refreshAccessToken().finally(() => {
            refreshPromise = null
          })
        }
        const token = await refreshPromise
        original.headers.Authorization = `Bearer ${token}`
        return api(original)
      } catch {
        clearTokens()
        window.location.href = "/login"
      }
    }
    return Promise.reject(error)
  },
)

function isPasswordChangeRequired(error: AxiosError): boolean {
  const data = error.response?.data as { code?: string } | undefined
  return data?.code === PASSWORD_CHANGE_REQUIRED_CODE
}

/**
 * LEGACY — superseded by the API's own localization.
 *
 * The API now resolves error text from the request's `Accept-Language` and
 * returns it in `message` alongside a stable `code`, so `getApiErrorMessage`
 * shows that text verbatim (see below). These maps remain only as a fallback
 * for any endpoint that still answers with a bare, un-coded message: without
 * them those strings would reach the UI untranslated.
 *
 * Do not extend these — add a catalogue entry on the server instead.
 */
const EXACT_ERROR_KEYS: Record<string, string> = {
  "Invalid credentials": "errors.invalidCredentials",
  "Account is disabled": "errors.userDisabled",
  "Invalid token": "errors.invalidToken",
  "Invalid refresh token": "errors.invalidRefreshToken",
  "Email already exists": "errors.emailAlreadyExists",
  "Initial setup has already been completed": "errors.setupAlreadyCompleted",
  "Passwords do not match": "validation.passwordsDoNotMatch",
  "Current password is incorrect": "errors.currentPasswordIncorrect",
  "New password must differ from the current one": "errors.passwordReused",
  "Password change required": "errors.passwordChangeRequired",
  "User not found": "errors.userNotFound",
  "Member not found": "errors.memberNotFound",
  "Meter not found": "errors.meterNotFound",
  "Consumption record not found": "errors.consumptionNotFound",
  "Payment record not found": "errors.paymentNotFound",
  "Discount not found": "errors.discountNotFound",
  "Role not found": "errors.roleNotFound",
  "Tariff not found": "errors.tariffNotFound",
  "Base tariff not found": "errors.baseTariffNotFound",
  "Water share not found": "errors.waterShareNotFound",
  "A meter with this code already exists": "errors.meterCodeExists",
  "A member with this CI already exists": "errors.memberCiExists",
  "Discount name already exists": "errors.discountNameExists",
  "Role name already exists": "errors.roleNameExists",
  "A consumption record already exists for this meter and period":
    "errors.consumptionExists",
  "Current reading cannot be lower than the previous reading":
    "errors.currentReadingLower",
  "A bill already exists for this consumption": "errors.billAlreadyExists",
  "This bill has already been fully paid": "errors.billFullyPaid",
  "Payment amount exceeds the remaining balance": "errors.paymentExceedsBalance",
  "Insufficient permissions": "errors.insufficientPermissions",
  "Cannot modify system role": "errors.cannotModifySystemRole",
  "Cannot delete system role": "errors.cannotDeleteSystemRole",
  "Cannot delete role assigned to users": "errors.cannotDeleteRoleInUse",
  "Cannot modify system role permissions":
    "errors.cannotModifySystemRolePermissions",
  "maxCubicMeters must be greater than minCubicMeters":
    "errors.maxGreaterThanMin",
}

const PREFIX_ERROR_KEYS: { prefix: string; key: string }[] = [
  {
    prefix: "Password does not meet the strength policy",
    key: "validation.weakPassword",
  },
  { prefix: "No existe tarifa base vigente", key: "errors.noValidBaseTariff" },
  { prefix: "No existe tarifa vigente para", key: "errors.noValidTariff" },
  { prefix: "El rango", key: "errors.overlappingTariff" },
  { prefix: "Ya existe una tarifa de acción vigente", key: "errors.overlappingShare" },
  { prefix: "Ya existe una tarifa base vigente", key: "errors.overlappingBaseTariff" },
  {
    prefix: "La fecha de fin debe ser posterior",
    key: "errors.endDateAfterStart",
  },
]

function translateApiMessage(message: string): string {
  const exact = EXACT_ERROR_KEYS[message]
  if (exact) return i18n.t(exact)
  for (const { prefix, key } of PREFIX_ERROR_KEYS) {
    if (message.startsWith(prefix)) return i18n.t(key)
  }
  return message
}

interface ApiErrorBody {
  message?: string | string[]
  code?: string
}

/**
 * Turns an API error into the text to show the user.
 *
 * The API owns server-side wording: when a response carries a `code`, its
 * `message` has already been localized to the language sent in
 * `Accept-Language` and is returned untouched — re-translating it here would
 * double-translate or, worse, treat a Spanish sentence as an i18next key.
 *
 * Responses without a `code` predate the error-code contract and still arrive
 * as raw server strings; those fall back to the legacy maps above.
 */
export function getApiErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as ApiErrorBody | undefined
    if (data?.message) {
      const message = Array.isArray(data.message)
        ? data.message.join(", ")
        : data.message
      if (data.code) return message
      return translateApiMessage(message)
    }
    // Network errors and empty bodies have nothing localized to show.
    return i18n.t("errors.default")
  }
  return i18n.t("errors.default")
}
