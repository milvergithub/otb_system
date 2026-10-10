import { Injectable } from '@nestjs/common';
import { I18nLoader, I18nTranslation } from 'nestjs-i18n';
import en from '../../locales/en';
import es from '../../locales/es';
import { SUPPORTED_LANGUAGES } from './languages';

/**
 * Serves the catalogues from TypeScript modules instead of reading JSON off
 * disk (which is what `I18nJsonLoader` does).
 *
 * Benefits over the file loader: the locale files are plain `src/locales/*.ts`
 * so `tsc` compiles them into `dist` with no `nest-cli.json` asset copy and no
 * `resolveJsonModule`; they are fully typed and refactorable; and they load
 * identically under `ts-jest`, where a path relative to `dist` would not exist.
 */
@Injectable()
export class StaticI18nLoader extends I18nLoader {
  async languages(): Promise<string[]> {
    return [...SUPPORTED_LANGUAGES];
  }

  async load(): Promise<I18nTranslation> {
    // Each language maps straight to its catalogue. `nestjs-i18n` resolves keys
    // against `translations[lang]`, so skipping the conventional extra
    // `translation` namespace level keeps keys identical to the client's
    // (`errors.MEMBER_NOT_FOUND`) instead of `translation.errors.…`.
    return { en, es } as unknown as I18nTranslation;
  }
}
