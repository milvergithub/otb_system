import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { I18nContext } from 'nestjs-i18n';
import { AppError } from '../../common/errors/app-error';
import {
  LocalizedValidationError,
  LocalizedValidationException,
} from '../../common/errors/localized-validation.exception';
import { MessageResolver } from '../../common/i18n/message-resolver';
import {
  SupportedLanguage,
  isSupportedLanguage,
  resolveLanguage,
} from '../../common/i18n/languages';

/** Default `error` label Nest would have produced for each status. */
const STATUS_LABEL: Partial<Record<HttpStatus, string>> = {
  [HttpStatus.BAD_REQUEST]: 'Bad Request',
  [HttpStatus.UNAUTHORIZED]: 'Unauthorized',
  [HttpStatus.FORBIDDEN]: 'Forbidden',
  [HttpStatus.NOT_FOUND]: 'Not Found',
  [HttpStatus.CONFLICT]: 'Conflict',
  [HttpStatus.SERVICE_UNAVAILABLE]: 'Service Unavailable',
  [HttpStatus.INTERNAL_SERVER_ERROR]: 'Internal Server Error',
};

interface ErrorBody {
  statusCode: number;
  error: string;
  code: string;
  message: string | string[];
  errors?: unknown;
}

/**
 * Builds every error body the API emits, so localized text is produced in
 * exactly one place and a translation key can never reach a client.
 *
 * Response shapes (the `code` field is new and purely additive — `message`
 * keeps the string/string[] shape clients already parse):
 *  - coded error   `{ statusCode, error, code, message }`
 *  - validation    `{ statusCode, error, code: 'VALIDATION_ERROR', message: string[], errors: [...] }`
 *  - legacy        whatever the throwing site built, forwarded untouched
 *  - unexpected    generic body; the real cause only goes to the logs
 */
@Catch()
export class I18nExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(I18nExceptionFilter.name);

  constructor(private readonly messages: MessageResolver) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const http = host.switchToHttp();
    const response = http.getResponse();
    const lang = this.resolveLang(http.getRequest());

    if (exception instanceof AppError) {
      const status = exception.getStatus();
      const body: ErrorBody = {
        statusCode: status,
        error: this.label(status),
        code: exception.code,
        message: this.messages.translateError(
          exception.code,
          exception.params,
          lang,
        ),
      };
      return response.status(status).json(body);
    }

    if (exception instanceof LocalizedValidationException) {
      const body = this.buildValidationBody(exception.errors, lang);
      return response.status(body.statusCode).json(body);
    }

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const body = exception.getResponse();
      if (typeof body === 'string') {
        return response.status(status).json({
          statusCode: status,
          error: this.label(status),
          message: body,
        });
      }
      // Object bodies (e.g. the password-change guard's hand-built payload)
      // are part of the existing contract; forward them as-is.
      return response.status(status).json(body);
    }

    this.logger.error(
      `Unhandled exception: ${(exception as Error)?.message}`,
      (exception as Error)?.stack,
    );
    return response
      .status(HttpStatus.INTERNAL_SERVER_ERROR)
      .json(this.internalErrorBody(lang));
  }

  private buildValidationBody(
    errors: LocalizedValidationError[],
    lang: SupportedLanguage,
  ): ErrorBody {
    const detailed = errors.map((error) => ({
      property: error.property,
      constraints: error.constraints.map((constraint) => {
        const key = constraint.key ?? `validation.${constraint.type}`;
        const message = this.messages.translate(key, constraint.args, lang);
        return {
          type: constraint.type,
          // A constraint missing from the catalogue degrades to class-validator's
          // own text rather than surfacing the key.
          message: message === key ? constraint.fallback : message,
        };
      }),
    }));

    return {
      statusCode: HttpStatus.BAD_REQUEST,
      error: this.label(HttpStatus.BAD_REQUEST),
      code: 'VALIDATION_ERROR',
      // Nest — and the React client — expect `message` to be the flat list of
      // strings, exactly as class-validator produced it before.
      message: detailed.flatMap((error) =>
        error.constraints.map((constraint) => constraint.message),
      ),
      errors: detailed,
    };
  }

  private internalErrorBody(lang: SupportedLanguage): ErrorBody {
    return {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      error: STATUS_LABEL[HttpStatus.INTERNAL_SERVER_ERROR] as string,
      code: 'INTERNAL_ERROR',
      message: this.messages.translateError('INTERNAL_ERROR', undefined, lang),
    };
  }

  /**
   * Prefers the language `nestjs-i18n` negotiated for this request. When the
   * exception escaped before the interceptor ran (guards run first in Nest),
   * the header is parsed directly so those errors are localized too.
   */
  private resolveLang(request: unknown): SupportedLanguage {
    const contextLang = I18nContext.current()?.lang;
    if (isSupportedLanguage(contextLang)) return contextLang;

    const headers = (request as { headers?: Record<string, string> })?.headers;
    return resolveLanguage(headers?.['accept-language']);
  }

  private label(status: number): string {
    const known = STATUS_LABEL[status as HttpStatus];
    if (known) return known;
    const name = HttpStatus[status as HttpStatus];
    if (!name) return 'Error';
    return name
      .toLowerCase()
      .split('_')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }
}
