import { afterEach, beforeAll, describe, expect, it } from "vitest"

import i18n, { SUPPORTED_LANGUAGES, toLocale } from "@/lib/i18n"

/** Representative keys from each layer the split is supposed to cover. */
const UI_KEYS = ["common.save", "common.cancel", "members.title", "nav.dashboard"]
const VALIDATION_KEYS = ["validation.required", "validation.minLength"]

beforeAll(async () => {
  if (!i18n.isInitialized) {
    await new Promise<void>((resolve) => i18n.on("initialized", () => resolve()))
  }
})

afterEach(() => i18n.changeLanguage("en"))

describe("frontend i18n", () => {
  it("keeps rendering its own strings after a language change (scenario 8)", async () => {
    await i18n.changeLanguage("es")
    const spanish = [...UI_KEYS, ...VALIDATION_KEYS].map((key) => i18n.t(key))

    await i18n.changeLanguage("en")
    const english = [...UI_KEYS, ...VALIDATION_KEYS].map((key) => i18n.t(key))

    expect(spanish).not.toEqual(english)
    for (const value of [...spanish, ...english]) {
      expect(value).not.toMatch(/^[a-zA-Z]+\.[a-zA-Z.]+$/)
    }
  })

  it("persists the choice so the next session starts in the same language", async () => {
    await i18n.changeLanguage("es")
    expect(localStorage.getItem("otb_lang")).toBe("es")
  })

  it("interpolates named values", async () => {
    await i18n.changeLanguage("en")
    expect(i18n.t("validation.minLength", { count: 3 })).toContain("3")
  })

  it("declares the same languages the API supports", async () => {
    expect(SUPPORTED_LANGUAGES.map((l) => l.code)).toEqual(["en", "es"])
  })

  it("maps the active language to a locale for Intl formatting", async () => {
    await i18n.changeLanguage("es")
    expect(toLocale(i18n.language)).toBe("es-BO")
    await i18n.changeLanguage("en")
    expect(toLocale(i18n.language)).toBe("en-US")
  })
})
