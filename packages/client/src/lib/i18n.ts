import i18n from "i18next"
import { initReactI18next } from "react-i18next"
import LanguageDetector from "i18next-browser-languagedetector"
import en from "@/locales/en.json"
import es from "@/locales/es.json"

export const SUPPORTED_LANGUAGES = [
  { code: "en", label: "English" },
  { code: "es", label: "Español" },
] as const

export function toLocale(lang: string): string {
  return lang.startsWith("es") ? "es-BO" : "en-US"
}

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      es: { translation: es },
    },
    fallbackLng: "en",
    supportedLngs: ["en", "es"],
    nonExplicitSupportedLngs: true,
    interpolation: {
      escapeValue: false,
    },
    detection: {
      order: ["localStorage", "navigator"],
      caches: ["localStorage"],
      lookupLocalStorage: "otb_lang",
    },
  })

i18n.on("languageChanged", (lng) => {
  const lang = lng.startsWith("es") ? "es" : "en"
  document.documentElement.lang = lang
})

export default i18n
