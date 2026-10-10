import { ValidationPipe } from '@nestjs/common';
import { ValidationError } from 'class-validator';
import {
  LocalizedValidationConstraint,
  LocalizedValidationError,
  LocalizedValidationException,
} from './localized-validation.exception';

/**
 * Extra interpolation values available to a catalogue entry.
 *
 * class-validator's own text is the only place the numeric bound survives
 * (`ValidationError` does not carry the metadata), so it is recovered from the
 * rendered message after stripping the property name the validator prefixes.
 * A miss simply omits the argument, and the filter then falls back to
 * class-validator's wording rather than emitting a half-filled template.
 */
const BOUND_CONSTRAINTS = new Set(['min', 'max', 'minLength', 'maxLength']);

function constraintArgs(
  type: string,
  fallback: string,
  property: string,
): Record<string, string | number> {
  if (!BOUND_CONSTRAINTS.has(type)) return {};

  const withoutProperty = fallback.startsWith(property)
    ? fallback.slice(property.length)
    : fallback;
  const bound = withoutProperty.match(/-?\d+(?:\.\d+)?/);
  if (!bound) return {};

  const name =
    type === 'minLength' ? 'min' : type === 'maxLength' ? 'max' : type;
  return { [name]: bound[0] };
}

const EXPLICIT_KEY = /^([A-Za-z0-9_.-]+)\|(.*)$/s;

/**
 * Reads the `key|args` form produced by `i18nMessage()`.
 */
function explicitKey(
  message: string,
): { key: string; args: Record<string, string | number> } | undefined {
  const match = message.match(EXPLICIT_KEY);
  if (!match) return undefined;
  try {
    return {
      key: match[1],
      args: match[2]
        ? (JSON.parse(match[2]) as Record<string, string | number>)
        : {},
    };
  } catch {
    return { key: match[1], args: {} };
  }
}

/**
 * Turns class-validator output into structured, translatable errors.
 *
 * class-validator reports `{ [constraintName]: englishMessage }` — e.g.
 * `{ isEmail: 'email must be an email' }`. The constraint *name* is the stable
 * part, so it is what maps to `validation.<constraint>` in the catalogue. That
 * is what lets the ~400 DTO decorators in this codebase answer in the
 * request's language without each one declaring a `message`. A decorator that
 * passes `i18nMessage('errors.X')` overrides that mapping.
 *
 * The English text is kept as `fallback` for constraints missing from the
 * catalogue. Rejected values are deliberately not carried over: a message must
 * never echo user input back.
 */
export function toLocalizedValidationErrors(
  errors: ValidationError[],
): LocalizedValidationError[] {
  return errors.map((error) => {
    const constraints = (error.constraints ?? {}) as Record<string, string>;
    return {
      property: error.property,
      constraints: Object.entries(
        constraints,
      ).map<LocalizedValidationConstraint>(([type, message]) => {
        const explicit = explicitKey(message);
        return {
          type,
          ...(explicit ? { key: explicit.key } : {}),
          fallback: message,
          args: {
            property: error.property,
            ...constraintArgs(type, message, error.property),
            ...(explicit?.args ?? {}),
          },
        };
      }),
    };
  });
}

/**
 * `ValidationPipe` whose failures carry the structure the exception filter
 * needs to localize them.
 *
 * `I18nValidationPipe` from `nestjs-i18n` translates constraint *strings*,
 * which leaves every decorator without an explicit `message` answering in
 * English. Classifying by constraint name instead localizes all of them while
 * preserving the `message: string[]` shape the client already parses.
 */
export class LocalizedValidationPipe extends ValidationPipe {
  constructor() {
    super({
      // Keep in sync with the pre-i18n pipe this replaces.
      whitelist: true,
      forbidNonWhitelisted: false,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
      exceptionFactory: (errors: ValidationError[]) =>
        new LocalizedValidationException(toLocalizedValidationErrors(errors)),
    });
  }
}
