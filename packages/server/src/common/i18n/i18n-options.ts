import { AcceptLanguageResolver, I18nOptions } from 'nestjs-i18n';
import { formatMessage } from './interpolate';
import { DEFAULT_LANGUAGE } from './languages';
import { StaticI18nLoader } from './static-i18n.loader';

/**
 * Single source of truth for how `nestjs-i18n` is configured.
 *
 * Exported as a factory so `app.module.ts` and the unit tests build the exact
 * same configuration.
 */
export function buildI18nOptions(): I18nOptions {
  return {
    loader: StaticI18nLoader,
    fallbackLanguage: DEFAULT_LANGUAGE,
    // Match `Accept-Language: es-BO` (and the shapes browsers actually send)
    // against the declared languages. `strict-loose` tries an exact match
    // first, then a region-insensitive one.
    resolvers: [
      {
        use: AcceptLanguageResolver,
        options: { matchType: 'strict-loose' },
      },
    ],
    // `{{name}}` like i18next, instead of string-format's `{name}`.
    formatter: formatMessage,
    // Single `translation` namespace, so keys are plain dotted paths
    // (`errors.MEMBER_NOT_FOUND`) exactly as the client's i18next keys are.
    nsSeparator: false,
    logging: false,
    throwOnMissingKey: false,
    typesOutputPath: undefined,
  };
}
