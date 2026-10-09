import { SetMetadata } from '@nestjs/common';

export const SKIP_PASSWORD_CHANGE_KEY = 'skipPasswordChange';

/**
 * Marks an endpoint as reachable while an account still holds a temporary
 * password. Only the handful of routes the change screen itself needs may use
 * it — anything else keeps the account blocked until the secret is replaced.
 */
export const SkipPasswordChange = () =>
  SetMetadata(SKIP_PASSWORD_CHANGE_KEY, true);
