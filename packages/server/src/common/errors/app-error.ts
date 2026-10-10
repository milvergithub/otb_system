import { HttpException, HttpStatus } from '@nestjs/common';
import { ErrorCode, statusForError } from './error-codes';

export type ErrorParams = Record<string, string | number>;

/**
 * The single exception type every service should throw for expected failures.
 *
 * It intentionally does NOT carry a message: the message is resolved by
 * `I18nExceptionFilter` at response time, using the language negotiated for the
 * current request. Passing a literal here would reintroduce the untranslatable
 * strings this class exists to replace.
 *
 * ```ts
 * throw new AppError('MEMBER_NOT_FOUND');
 * throw new AppError('TRANSACTION_NOT_FOUND', { id });
 * ```
 */
export class AppError extends HttpException {
  readonly code: ErrorCode;
  readonly params: ErrorParams;

  constructor(
    code: ErrorCode,
    params: ErrorParams = {},
    /**
     * Only needed where a site historically answered with a status other than
     * the code's canonical one. Prefer letting the registry decide.
     */
    status?: HttpStatus,
  ) {
    // The body below is a placeholder for anything that bypasses the global
    // filter; the filter is what actually builds the wire response.
    super(
      { statusCode: status ?? statusForError(code), code },
      status ?? statusForError(code),
    );
    this.code = code;
    this.params = params;
  }
}
