/**
 * Marks a class-validator `message` as a catalogue key instead of literal copy.
 *
 * Most decorators need nothing: the constraint name already maps to
 * `validation.<type>` and is localized automatically. This is only for the
 * handful of decorators whose wording is not derivable from the constraint
 * itself, e.g. `Match('newPassword')` should say "Passwords do not match"
 * rather than "newPasswordConfirmation must match newPassword".
 *
 * ```ts
 * @Match('newPassword', { message: i18nMessage('errors.PASSWORDS_DO_NOT_MATCH') })
 * ```
 *
 * `LocalizedValidationPipe` parses the `key|args` encoding; see
 * `toLocalizedValidationErrors`.
 */
export function i18nMessage(
  key: string,
  args?: Record<string, string | number>,
): string {
  return args ? `${key}|${JSON.stringify(args)}` : `${key}|`;
}
