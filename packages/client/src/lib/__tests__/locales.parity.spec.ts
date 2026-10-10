import { describe, expect, it } from "vitest"

import en from "@/locales/en.json"
import es from "@/locales/es.json"

/** Flattens a nested catalogue into dot-separated leaf paths. */
function leafPaths(value: unknown, prefix = ""): string[] {
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return [prefix]
  }
  return Object.entries(value as Record<string, unknown>).flatMap(([key, child]) =>
    leafPaths(child, prefix ? `${prefix}.${key}` : key),
  )
}

describe("locale catalogues", () => {
  const enPaths = leafPaths(en).sort()
  const esPaths = leafPaths(es).sort()

  it("have exactly the same keys in both languages", () => {
    expect(esPaths.filter((path) => !enPaths.includes(path))).toEqual([])
    expect(enPaths.filter((path) => !esPaths.includes(path))).toEqual([])
  })

  it("leave no empty strings that would render as blank copy", () => {
    const blanks = enPaths.filter((path) => {
      const value = path
        .split(".")
        .reduce<unknown>((acc, key) => (acc as Record<string, unknown>)[key], en)
      return typeof value === "string" && value.trim() === ""
    })
    expect(blanks).toEqual([])
  })

  it("interpolate placeholders the same way in both languages", () => {
    const placeholders = (value: string) =>
      (value.match(/\{\{\s*[^}]+\s*\}\}/g) ?? []).map((p) => p.replace(/\s+/g, "")).sort()

    const lookup = (catalogue: unknown, path: string): string =>
      path
        .split(".")
        .reduce<unknown>((acc, key) => (acc as Record<string, unknown>)[key], catalogue) as string

    const mismatched = enPaths.filter((path) => {
      const enValue = lookup(en, path)
      const esValue = lookup(es, path)
      if (typeof enValue !== "string" || typeof esValue !== "string") return false
      return placeholders(enValue).join(",") !== placeholders(esValue).join(",")
    })

    expect(mismatched).toEqual([])
  })
})
