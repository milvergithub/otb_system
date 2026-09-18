import axios, {
  AxiosError,
  type InternalAxiosRequestConfig,
} from "axios"
import i18n from "@/lib/i18n"

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

api.interceptors.request.use((config) => {
  const token = getAccessToken()
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
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
  const res = await axios.post(`${API_URL}/auth/refresh`, { refreshToken })
  const { accessToken, refreshToken: newRefresh } = res.data
  setTokens(accessToken, newRefresh)
  return accessToken
}

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const original = error.config as RetryConfig | undefined
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

const EXACT_ERROR_KEYS: Record<string, string> = {
  "Invalid credentials": "errors.invalidCredentials",
  "Account is disabled": "errors.userDisabled",
  "Invalid token": "errors.invalidToken",
  "Invalid refresh token": "errors.invalidRefreshToken",
  "Email already exists": "errors.emailAlreadyExists",
  "Email already registered": "errors.emailAlreadyRegistered",
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

export function getApiErrorMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const data = error.response?.data as
      | { message?: string | string[] }
      | undefined
    if (data?.message) {
      if (Array.isArray(data.message)) {
        return data.message.map(translateApiMessage).join(", ")
      }
      return translateApiMessage(data.message)
    }
    return error.message
  }
  return i18n.t("errors.default")
}
