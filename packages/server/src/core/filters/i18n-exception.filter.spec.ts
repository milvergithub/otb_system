import { ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { I18nContext, I18nModule, I18nService } from 'nestjs-i18n';
import { AppError } from '../../common/errors/app-error';
import { LocalizedValidationException } from '../../common/errors/localized-validation.exception';
import { buildI18nOptions } from '../../common/i18n/i18n-options';
import { MessageResolver } from '../../common/i18n/message-resolver';
import { I18nExceptionFilter } from './i18n-exception.filter';

interface Captured {
  statusCode: number;
  body: Record<string, unknown>;
}

function makeHost(headers: Record<string, string> = {}): {
  host: ArgumentsHost;
  captured: Captured;
} {
  const captured: Captured = { statusCode: 0, body: {} };
  const response = {
    status(code: number) {
      captured.statusCode = code;
      return response;
    },
    json(body: Record<string, unknown>) {
      captured.body = body;
      return response;
    },
  };
  const host = {
    switchToHttp: () => ({
      getResponse: () => response,
      getRequest: () => ({ headers }),
    }),
  } as unknown as ArgumentsHost;

  return { host, captured };
}

describe('I18nExceptionFilter', () => {
  let filter: I18nExceptionFilter;
  let resolver: MessageResolver;
  let i18n: I18nService;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [I18nModule.forRoot(buildI18nOptions())],
      providers: [MessageResolver, I18nExceptionFilter],
    }).compile();
    await moduleRef.init();

    resolver = moduleRef.get(MessageResolver);
    i18n = moduleRef.get(I18nService);
    filter = new I18nExceptionFilter(resolver);
  });

  /** Runs `fn` as if it were executing inside a request negotiated as `lang`. */
  function inLanguage<T>(lang: string, fn: () => T): T {
    const context = new I18nContext(lang, i18n, undefined as never);
    let out!: T;
    I18nContext.create(context, () => {
      out = fn();
    });
    return out;
  }

  it('localizes a coded error and keeps the code identical across languages (scenarios 3, 5)', () => {
    const { host, captured } = makeHost({ 'accept-language': 'es' });
    filter.catch(new AppError('MEMBER_NOT_FOUND'), host);

    expect(captured.statusCode).toBe(HttpStatus.NOT_FOUND);
    expect(captured.body.code).toBe('MEMBER_NOT_FOUND');
    expect(captured.body.message).toBe('Socio no encontrado');
    expect(captured.body.error).toBe('Not Found');

    const english = makeHost({ 'accept-language': 'en' });
    filter.catch(new AppError('MEMBER_NOT_FOUND'), english.host);

    expect(english.captured.body.code).toBe('MEMBER_NOT_FOUND');
    expect(english.captured.body.message).toBe('Member not found');
  });

  it('interpolates parameters in the active language', () => {
    const { host, captured } = makeHost({ 'accept-language': 'es' });
    filter.catch(
      new AppError('OBLIGATION_EXCEEDS_BALANCE', { balance: '120.50' }),
      host,
    );

    expect(captured.body.message).toContain('120.50');
    expect(captured.body.message).not.toContain('{{');
  });

  it('falls back to the server default when no language is requested (scenario 9)', () => {
    const { host, captured } = makeHost();
    filter.catch(new AppError('MEMBER_NOT_FOUND'), host);

    expect(captured.body.message).toBe('Member not found');
  });

  it('falls back to the server default for an unsupported language', () => {
    const { host, captured } = makeHost({ 'accept-language': 'fr-FR' });
    filter.catch(new AppError('MEMBER_NOT_FOUND'), host);

    expect(captured.body.message).toBe('Member not found');
  });

  it('reads the language negotiated by the i18n interceptor over the header', () => {
    const { host, captured } = makeHost({ 'accept-language': 'en' });
    inLanguage('es', () =>
      filter.catch(new AppError('MEMBER_NOT_FOUND'), host),
    );

    expect(captured.body.message).toBe('Socio no encontrado');
  });

  it('never leaks a translation key when a message is missing in the requested language', () => {
    // `es` has no entry for this key; the English catalogue must take over.
    const missing = 'A_CODE_THAT_DOES_NOT_EXIST' as never;
    const resolved = resolver.translateError(
      missing,
      undefined,
      'es',
      'Safe text',
    );

    expect(resolved).not.toContain('errors.');
    expect(resolved).toBe('Safe text');
  });

  it('renders validation errors as a localized message list plus details (scenario 3)', () => {
    const { host, captured } = makeHost({ 'accept-language': 'es' });
    const exception = new LocalizedValidationException([
      {
        property: 'email',
        constraints: [
          {
            type: 'isEmail',
            fallback: 'email must be an email',
            args: { property: 'email' },
          },
        ],
      },
      {
        property: 'age',
        constraints: [
          {
            type: 'min',
            fallback: 'age must not be less than 18',
            args: { property: 'age', min: '18' },
          },
        ],
      },
    ]);

    filter.catch(exception, host);

    expect(captured.statusCode).toBe(HttpStatus.BAD_REQUEST);
    expect(captured.body.code).toBe('VALIDATION_ERROR');
    expect(captured.body.message).toEqual([
      'email debe ser un correo electrónico válido',
      'age no puede ser menor que 18',
    ]);
    expect(captured.body.errors).toEqual([
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

  it('degrades to the class-validator text for a constraint with no catalogue entry', () => {
    const { host, captured } = makeHost({ 'accept-language': 'es' });
    const exception = new LocalizedValidationException([
      {
        property: 'value',
        constraints: [
          {
            type: 'someBrandNewConstraint',
            fallback: 'value must satisfy someBrandNewConstraint',
            args: { property: 'value' },
          },
        ],
      },
    ]);

    filter.catch(exception, host);

    expect(captured.body.message).toEqual([
      'value must satisfy someBrandNewConstraint',
    ]);
  });

  it('forwards a hand-built exception body untouched', () => {
    const { host, captured } = makeHost({ 'accept-language': 'es' });
    const body = {
      statusCode: 403,
      error: 'Forbidden',
      message: 'Password change required',
      code: 'PASSWORD_CHANGE_REQUIRED',
    };

    filter.catch(new HttpException(body, HttpStatus.FORBIDDEN), host);

    expect(captured.statusCode).toBe(HttpStatus.FORBIDDEN);
    expect(captured.body).toEqual(body);
  });

  it('keeps plain string exceptions working', () => {
    const { host, captured } = makeHost();
    filter.catch(new HttpException('boom', HttpStatus.CONFLICT), host);

    expect(captured.body).toEqual({
      statusCode: HttpStatus.CONFLICT,
      error: 'Conflict',
      message: 'boom',
    });
  });

  it('answers unexpected failures with a generic localized body and no internals', () => {
    const { host, captured } = makeHost({ 'accept-language': 'es' });

    filter.catch(
      new Error('connection string postgres://user:hunter2@db'),
      host,
    );

    expect(captured.statusCode).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
    expect(captured.body.code).toBe('INTERNAL_ERROR');
    expect(captured.body.message).toBe('Ocurrió un error inesperado');
    expect(JSON.stringify(captured.body)).not.toContain('hunter2');
  });

  it('keeps concurrent requests in different languages apart (scenario 10)', async () => {
    const spanish = makeHost({ 'accept-language': 'es' });
    const english = makeHost({ 'accept-language': 'en' });

    // Both requests are started before either resolves, and each yields once in
    // the middle, so they genuinely interleave. A shared (non request-scoped)
    // language would show up here as cross-talk.
    const order: string[] = [];
    const respondIn = (lang: string, host: ArgumentsHost) =>
      I18nContext.createAsync(
        new I18nContext(lang, i18n, undefined as never),
        async () => {
          order.push(`${lang}:start`);
          await Promise.resolve();
          order.push(`${lang}:respond`);
          filter.catch(new AppError('MEMBER_NOT_FOUND'), host);
        },
      );

    await Promise.all([
      respondIn('es', spanish.host),
      respondIn('en', english.host),
    ]);

    expect(order).toEqual(['es:start', 'en:start', 'es:respond', 'en:respond']);

    expect(spanish.captured.body.message).toBe('Socio no encontrado');
    expect(spanish.captured.body.code).toBe('MEMBER_NOT_FOUND');
    expect(english.captured.body.message).toBe('Member not found');
    expect(english.captured.body.code).toBe('MEMBER_NOT_FOUND');
  });
});
