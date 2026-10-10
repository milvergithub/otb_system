import { I18nContext } from 'nestjs-i18n';
import { DEFAULT_LANGUAGE, SupportedLanguage } from './languages';

const INTL_LOCALE: Record<SupportedLanguage, string> = {
  en: 'en-US',
  es: 'es-BO',
};

/**
 * Formats a date for an error message.
 *
 * Dates embedded in messages used to be hard-coded to `es-BO`, which read wrong
 * to an English-speaking user. This resolves the request's language instead,
 * defaulting outside a request (cron jobs, WhatsApp sends).
 */
export function formatDateForMessage(
  value: Date,
  lang?: SupportedLanguage,
): string {
  const resolved =
    lang ??
    (I18nContext.current()?.lang as SupportedLanguage) ??
    DEFAULT_LANGUAGE;
  return value.toLocaleDateString(INTL_LOCALE[resolved] ?? INTL_LOCALE.en, {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
}
