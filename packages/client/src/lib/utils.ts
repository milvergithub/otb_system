import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"
import i18n, { toLocale } from "@/lib/i18n"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number | string, currency = "BOB") {
  const value = typeof amount === "string" ? parseFloat(amount) : amount
  return new Intl.NumberFormat(toLocale(i18n.language), {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
  }).format(value || 0)
}

export function formatDate(date: string | Date) {
  return new Date(date).toLocaleDateString(toLocale(i18n.language), {
    year: "numeric",
    month: "short",
    day: "numeric",
  })
}

export function monthNames(): string[] {
  const locale = toLocale(i18n.language)
  return Array.from({ length: 12 }, (_, i) =>
    new Intl.DateTimeFormat(locale, { month: "long" }).format(
      new Date(2020, i, 1),
    ),
  )
}

export function googleMapsUrl(lat: number | string, lng: number | string) {
  return `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`
}

export function getWhatsAppUrl(
  phone: string | null | undefined,
  country = "BO",
): string | null {
  if (!phone) return null
  const cleaned = phone.replace(/\D/g, "")
  if (!cleaned) return null
  const DIAL_CODES: Record<string, string> = {
    AR: "54", BO: "591", BR: "55", CL: "56", CO: "57", EC: "593",
    GY: "592", PY: "595", PE: "51", SR: "597", UY: "598", VE: "58", US: "1",
  }
  const dial = DIAL_CODES[country] ?? "591"
  const number = cleaned.startsWith(dial) ? cleaned : `${dial}${cleaned}`
  return `https://wa.me/${number}`
}
