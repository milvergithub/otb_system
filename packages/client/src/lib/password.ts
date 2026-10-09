/**
 * Mirror of `packages/server/src/common/utils/password.ts`.
 *
 * There is no shared package between client and server, so this policy is
 * duplicated deliberately — the server copy is authoritative and this one only
 * drives the live feedback meter. If you change one, change the other.
 */
export const PASSWORD_MIN_LENGTH = 8
export const PASSWORD_MAX_LENGTH = 72

export type PasswordRule = "length" | "lowercase" | "uppercase" | "digit" | "symbol"

export const PASSWORD_RULES: PasswordRule[] = [
  "length",
  "lowercase",
  "uppercase",
  "digit",
  "symbol",
]

/**
 * Route that holds the forced-change screen. Kept in a leaf module so both the
 * router and the axios interceptor can reach it without importing components.
 */
export const PASSWORD_CHANGE_PATH = "/cambiar-contrasena"

const CLASS_PATTERNS: Record<Exclude<PasswordRule, "length">, RegExp> = {
  lowercase: /[a-z]/,
  uppercase: /[A-Z]/,
  digit: /[0-9]/,
  symbol: /[^a-zA-Z0-9]/,
}

export function checkPasswordStrength(value: string): {
  valid: boolean
  failures: PasswordRule[]
} {
  const failures: PasswordRule[] = []

  if (typeof value !== "string" || value.length < PASSWORD_MIN_LENGTH || value.length > PASSWORD_MAX_LENGTH) {
    failures.push("length")
  }

  if (typeof value === "string") {
    for (const rule of PASSWORD_RULES) {
      if (rule === "length") continue
      if (!CLASS_PATTERNS[rule].test(value)) failures.push(rule)
    }
  }

  return { valid: failures.length === 0, failures }
}
