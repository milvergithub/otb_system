import { BadRequestException } from '@nestjs/common';
import { ERROR_STATUS, ErrorCode } from './error-codes';

export interface LocalizedValidationConstraint {
  /** class-validator constraint name, e.g. `isEmail`, `minLength`, `match`. */
  type: string;
  /**
   * Explicit catalogue key, when the DTO asked for one through `i18nMessage()`.
   * Defaults to `validation.<type>`.
   */
  key?: string;
  /** Raw message produced by class-validator, used only as a last-resort fallback. */
  fallback: string;
  /** Interpolation values for the catalogue entry. */
  args: Record<string, string | number>;
}

export interface LocalizedValidationError {
  property: string;
  constraints: LocalizedValidationConstraint[];
}

export interface LocalizedValidationBody {
  statusCode: number;
  code: ErrorCode;
  message: string[];
  errors: LocalizedValidationError[];
}

/**
 * A `BadRequestException` carrying structured, pre-classified validation
 * errors.
 *
 * The message itself is left empty on purpose: `I18nExceptionFilter` fills in
 * the localized `message` array (and the per-field `errors` array) once it
 * knows the request language. Keeping the raw class-validator string in
 * `fallback` means an unlisted constraint still produces a readable message
 * instead of a leaked translation key.
 */
export class LocalizedValidationException extends BadRequestException {
  constructor(readonly errors: LocalizedValidationError[]) {
    super({
      statusCode: ERROR_STATUS.VALIDATION_ERROR,
      code: 'VALIDATION_ERROR' satisfies ErrorCode,
      message: [],
      errors: [],
    });
  }

  static body(
    errors: LocalizedValidationError[],
    message: string[],
  ): LocalizedValidationBody {
    return {
      statusCode: ERROR_STATUS.VALIDATION_ERROR,
      code: 'VALIDATION_ERROR',
      message,
      errors,
    };
  }
}
