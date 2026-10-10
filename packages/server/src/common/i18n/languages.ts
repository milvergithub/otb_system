/**
 * Languages the API can answer in.
 *
 * Mirrors `SUPPORTED_LANGUAGES` / `fallbackLng` in the React app
 * (`packages/client/src/lib/i18n.ts`). Keep both lists in sync: the client
 * sends its active language verbatim in `Accept-Language`, so a language the
 * server does not declare silently falls back to `DEFAULT_LANGUAGE`.
 */
export const SUPPORTED_LANGUAGES = ['en', 'es'] as const;

export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

/**
 * Language used when a request carries no (or an unsupported)
 * `Accept-Language` header. Matches the client's `fallbackLng: 'en'`.
 */
export const DEFAULT_LANGUAGE: SupportedLanguage = 'en';

export function isSupportedLanguage(
  value: unknown,
): value is SupportedLanguage {
  return (
    typeof value === 'string' &&
    (SUPPORTED_LANGUAGES as readonly string[]).includes(value)
  );
}

/**
 * Normalizes an `Accept-Language` header to a supported language.
 *
 * Handles the shapes browsers actually send: `es`, `es-BO`, `es-BO,es;q=0.9`,
 * `*`. Quality values are honoured so `en-US;q=0.5, es;q=0.9` resolves to `es`.
 */
export function resolveLanguage(header?: string | null): SupportedLanguage {
  if (!header) return DEFAULT_LANGUAGE;

  const ranked = header
    .split(',')
    .map((part) => {
      const [tag, ...params] = part.trim().split(';');
      const q = params
        .map((p) => p.trim())
        .filter((p) => p.startsWith('q='))
        .map((p) => Number.parseFloat(p.slice(2)))[0];
      return {
        tag: tag.trim().toLowerCase(),
        quality: Number.isFinite(q) ? (q as number) : 1,
      };
    })
    .filter((entry) => entry.tag.length > 0)
    .sort((a, b) => b.quality - a.quality);

  for (const { tag } of ranked) {
    if (tag === '*') continue;
    const base = tag.split('-')[0];
    if (isSupportedLanguage(base)) return base;
  }

  return DEFAULT_LANGUAGE;
}
