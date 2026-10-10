import { ArgumentsHost } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { IsEmail, IsInt, IsString, Min, MinLength } from 'class-validator';
import { Type } from 'class-transformer';
import { I18nModule } from 'nestjs-i18n';
import { buildI18nOptions } from '../i18n/i18n-options';
import {
  DEFAULT_LANGUAGE,
  SUPPORTED_LANGUAGES,
  resolveLanguage,
} from '../i18n/languages';
import { MessageResolver } from '../i18n/message-resolver';
import { LocalizedValidationPipe } from './localized-validation.pipe';
import { LocalizedValidationException } from './localized-validation.exception';
import { I18nExceptionFilter } from '../../core/filters/i18n-exception.filter';

describe('resolveLanguage', () => {
  it('defaults when no header is present (scenario 9)', () => {
    expect(resolveLanguage(undefined)).toBe(DEFAULT_LANGUAGE);
    expect(resolveLanguage('')).toBe(DEFAULT_LANGUAGE);
  });

  it('reads a plain tag', () => {
    expect(resolveLanguage('es')).toBe('es');
    expect(resolveLanguage('en')).toBe('en');
  });

  it('collapses regional tags, as browsers send them', () => {
    expect(resolveLanguage('es-BO')).toBe('es');
    expect(resolveLanguage('en-US,en;q=0.9')).toBe('en');
  });

  it('honours quality values', () => {
    expect(resolveLanguage('en-US;q=0.5, es;q=0.9')).toBe('es');
  });

  it('falls back for unsupported or wildcard languages', () => {
    expect(resolveLanguage('fr-FR')).toBe(DEFAULT_LANGUAGE);
    expect(resolveLanguage('*')).toBe(DEFAULT_LANGUAGE);
  });

  it('declares exactly the languages the client switches between', () => {
    expect([...SUPPORTED_LANGUAGES]).toEqual(['en', 'es']);
  });
});

/** Mirrors the app's DTOs: not one decorator carries a `message`. */
class SampleDto {
  @IsString()
  @MinLength(8)
  name!: string;

  @IsEmail()
  email!: string;

  @Type(() => Number)
  @IsInt()
  @Min(18)
  age!: number;
}

const INVALID = { name: 'ab', email: 'nope', age: 4 };

describe('DTO validation localization (scenario 3)', () => {
  let filter: I18nExceptionFilter;
  const pipe = new LocalizedValidationPipe();

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [I18nModule.forRoot(buildI18nOptions())],
      providers: [MessageResolver, I18nExceptionFilter],
    }).compile();
    await moduleRef.init();
    filter = new I18nExceptionFilter(moduleRef.get(MessageResolver));
  });

  /** Runs the pipe, then the filter, exactly as an HTTP request would. */
  async function validate(language?: string): Promise<Record<string, unknown>> {
    let caught: unknown;
    try {
      await pipe.transform(INVALID, { type: 'body', metatype: SampleDto });
    } catch (error) {
      caught = error;
    }
    expect(caught).toBeInstanceOf(LocalizedValidationException);

    let captured: Record<string, unknown> = {};
    const response = {
      status: () => response,
      json: (body: Record<string, unknown>) => {
        captured = body;
        return response;
      },
    };
    const host = {
      switchToHttp: () => ({
        getResponse: () => response,
        getRequest: () => ({
          headers: language ? { 'accept-language': language } : {},
        }),
      }),
    } as unknown as ArgumentsHost;

    filter.catch(caught, host);
    return captured;
  }

  it('answers in Spanish without any DTO declaring a message', async () => {
    const body = await validate('es');

    expect(body.code).toBe('VALIDATION_ERROR');
    expect(body.statusCode).toBe(400);
    expect(body.message).toEqual([
      'name debe tener al menos 8 caracteres',
      'email debe ser un correo electrónico válido',
      'age no puede ser menor que 18',
    ]);
  });

  it('answers in English for an English request', async () => {
    const body = await validate('en');

    expect(body.message).toEqual([
      'name must be at least 8 characters',
      'email must be a valid email address',
      'age must not be less than 18',
    ]);
  });

  it('uses the server default when no language is requested', async () => {
    expect((await validate()).message).toEqual((await validate('en')).message);
  });

  it('keeps the message list shape the client already parses', async () => {
    expect(Array.isArray((await validate('es')).message)).toBe(true);
  });

  it('groups the messages per field for the detailed view', async () => {
    expect((await validate('es')).errors).toEqual([
      {
        property: 'name',
        constraints: [
          {
            type: 'minLength',
            message: 'name debe tener al menos 8 caracteres',
          },
        ],
      },
      {
        property: 'email',
        constraints: [
          {
            type: 'isEmail',
            message: 'email debe ser un correo electrónico válido',
          },
        ],
      },
      {
        property: 'age',
        constraints: [
          { type: 'min', message: 'age no puede ser menor que 18' },
        ],
      },
    ]);
  });

  it('still strips unknown properties, as the previous pipe did', async () => {
    const result = await pipe.transform(
      {
        ...INVALID,
        name: 'long-enough',
        email: 'a@b.co',
        age: 20,
        sneaky: 'x',
      },
      { type: 'body', metatype: SampleDto },
    );

    expect(result).not.toHaveProperty('sneaky');
    expect(result).toMatchObject({ name: 'long-enough', age: 20 });
  });
});
