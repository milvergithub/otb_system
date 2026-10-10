/**
 * Placeholder syntax shared with the React app.
 *
 * i18next interpolates `{{name}}`; `nestjs-i18n`'s default formatter
 * (`string-format`) expects `{name}`. Using the default would make the two
 * catalogues read differently for the same concept, so the server installs
 * this formatter instead and every server message uses `{{name}}` — matching
 * `packages/client/src/locales/*.json`.
 */
const PLACEHOLDER = /\{\{\s*([^{}]+?)\s*\}\}/g;

function lookup(args: unknown, path: string): string | undefined {
  if (args === null || args === undefined) return undefined;
  if (typeof args !== 'object') return undefined;
  const value = path
    .split('.')
    .reduce<unknown>(
      (acc, segment) =>
        acc !== null && typeof acc === 'object'
          ? (acc as Record<string, unknown>)[segment]
          : undefined,
      args,
    );
  if (value === undefined || value === null) return undefined;
  return typeof value === 'object' ? JSON.stringify(value) : String(value);
}

export function interpolate(template: string, ...args: unknown[]): string {
  return template.replace(PLACEHOLDER, (match, path: string) => {
    for (const arg of args) {
      if (Array.isArray(arg) && /^\d+$/.test(path)) {
        const positional = arg[Number(path)];
        if (positional !== undefined) return String(positional);
        continue;
      }
      const found = lookup(arg, path);
      if (found !== undefined) return found;
    }
    return match;
  });
}

/**
 * `I18nOptions.formatter` implementation.
 */
export function formatMessage(template: string, ...args: unknown[]): string {
  return interpolate(template, ...args);
}
