import { registerDecorator, ValidationOptions } from 'class-validator';
import { checkPasswordStrength } from '../utils/password';

export const PASSWORD_TOO_WEAK =
  'Password does not meet the strength policy (8+ characters with an uppercase letter, a lowercase letter, a digit and a symbol)';

/**
 * Checks a value against the single shared policy in `utils/password`.
 *
 * Kept as a decorator rather than inline service checks so DTO validation
 * rejects weak input before the handler runs, matching how the codebase
 * already validates with class-validator.
 */
export function IsStrongPassword(validationOptions?: ValidationOptions) {
  return (object: object, propertyName: string) => {
    registerDecorator({
      name: 'isStrongPassword',
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate(value: unknown): boolean {
          return (
            typeof value === 'string' && checkPasswordStrength(value).valid
          );
        },
        defaultMessage(): string {
          // Exact string, not prefixed with the property name, so the client
          // can map it to a translation key with a single lookup.
          return PASSWORD_TOO_WEAK;
        },
      },
    });
  };
}
