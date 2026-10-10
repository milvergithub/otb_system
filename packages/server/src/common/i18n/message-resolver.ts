import { Injectable } from '@nestjs/common';
import { I18nService } from 'nestjs-i18n';
import { ErrorCode, errorKey } from '../errors/error-codes';
import {
  DEFAULT_LANGUAGE,
  SupportedLanguage,
  isSupportedLanguage,
} from './languages';

/** Any placeholder the formatter could not fill in. */
const UNRESOLVED_PLACEHOLDER = /\{\{[^{}]*\}\}/;

/**
 * Resolves catalogue keys to user-facing text.
 *
 * The single guarantee this service provides: a translation key — or a
 * half-rendered template — can never reach the client. `nestjs-i18n` returns
 * the key itself when a lookup misses, so every resolution is checked and
 * stepped down through English to a safe literal.
 */
@Injectable()
export class MessageResolver {
  constructor(private readonly i18n: I18nService) {}

  /**
   * @param lang explicit language; omit to use the request's negotiated one
   *             (falls back to the server default outside a request).
   */
  translate(
    key: string,
    args?: Record<string, string | number>,
    lang?: SupportedLanguage,
  ): string {
    const language = lang ?? DEFAULT_LANGUAGE;

    const primary = this.lookup(key, args, language);
    if (primary !== undefined) return primary;

    // Requested language has no entry (or the catalogue is missing entirely).
    const fallback = this.lookup(key, args, DEFAULT_LANGUAGE);
    if (fallback !== undefined) return fallback;

    return key;
  }

  /**
   * Translates an error code, guaranteeing a non-empty message.
   *
   * @param lastResort text to use only if even the English catalogue entry is
   *                   missing — prevents a key from leaking to the UI.
   */
  translateError(
    code: ErrorCode,
    args?: Record<string, string | number>,
    lang?: SupportedLanguage,
    lastResort?: string,
  ): string {
    const key = errorKey(code);
    const message = this.translate(key, args, lang);
    if (message !== key) return message;
    return (
      lastResort ??
      this.translate('errors.INTERNAL_ERROR', undefined, DEFAULT_LANGUAGE)
    );
  }

  /** `true` when `value` is a real translation rather than an unresolved key. */
  private lookup(
    key: string,
    args: Record<string, string | number> | undefined,
    lang: string,
  ): string | undefined {
    const resolved = this.i18n.translate(key, {
      lang: isSupportedLanguage(lang) ? lang : DEFAULT_LANGUAGE,
      args,
    } as Parameters<I18nService['translate']>[1]);

    if (typeof resolved !== 'string') return undefined;
    // nestjs-i18n echoes the key back when nothing matched.
    if (resolved === key) return undefined;
    // A template whose arguments were missing is not user-facing copy either.
    if (UNRESOLVED_PLACEHOLDER.test(resolved)) return undefined;
    return resolved;
  }
}
