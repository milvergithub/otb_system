export interface PhoneCountry {
  code: string
  name: string
  dialCode: string
  flag: string
}

export const COUNTRIES: PhoneCountry[] = [
  { code: "AR", name: "Argentina", dialCode: "54", flag: "🇦🇷" },
  { code: "BO", name: "Bolivia", dialCode: "591", flag: "🇧🇴" },
  { code: "BR", name: "Brasil", dialCode: "55", flag: "🇧🇷" },
  { code: "CL", name: "Chile", dialCode: "56", flag: "🇨🇱" },
  { code: "CO", name: "Colombia", dialCode: "57", flag: "🇨🇴" },
  { code: "EC", name: "Ecuador", dialCode: "593", flag: "🇪🇨" },
  { code: "GY", name: "Guyana", dialCode: "592", flag: "🇬🇾" },
  { code: "PY", name: "Paraguay", dialCode: "595", flag: "🇵🇾" },
  { code: "PE", name: "Perú", dialCode: "51", flag: "🇵🇪" },
  { code: "SR", name: "Surinam", dialCode: "597", flag: "🇸🇷" },
  { code: "UY", name: "Uruguay", dialCode: "598", flag: "🇺🇾" },
  { code: "VE", name: "Venezuela", dialCode: "58", flag: "🇻🇪" },
  { code: "US", name: "Estados Unidos", dialCode: "1", flag: "🇺🇸" },
]

export const DIAL_CODES: Record<string, string> = Object.fromEntries(
  COUNTRIES.map((c) => [c.code, c.dialCode])
)

export function getDialCode(country: string): string {
  return DIAL_CODES[country] ?? "591"
}

export function getWhatsAppUrl(
  phone: string | null | undefined,
  country = "BO"
): string | null {
  if (!phone) return null
  const cleaned = phone.replace(/\D/g, "")
  if (!cleaned) return null
  const dial = getDialCode(country)
  const number = cleaned.startsWith(dial) ? cleaned : `${dial}${cleaned}`
  return `https://wa.me/${number}`
}
