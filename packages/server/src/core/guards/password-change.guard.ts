import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { SKIP_PASSWORD_CHANGE_KEY } from '../../common/decorators/skip-password-change.decorator';
import { AppError } from '../../common/errors/app-error';
import type { ErrorCode } from '../../common/errors/error-codes';

/**
 * The wire `code` the client branches on (`PASSWORD_CHANGE_REQUIRED_CODE` in
 * `packages/client/src/lib/api.ts`). The message is localized from the
 * catalogue by `I18nExceptionFilter`; see its spec for the rendered body.
 */
export const PASSWORD_CHANGE_REQUIRED_CODE: ErrorCode =
  'PASSWORD_CHANGE_REQUIRED';

/**
 * Blocks every non-exempt endpoint while the caller's token carries the
 * temporary-password claim.
 *
 * Reading the claim from the token rather than the database keeps this on the
 * hot path without a query. The claim is reissued the moment the password is
 * changed, which is why `changePassword` hands back a fresh token pair.
 *
 * Registered after `JwtAuthGuard` (which populates `req.user`) and before
 * `RolesGuard`, so a blocked caller sees the reason they actually care about
 * instead of a permission error.
 */
@Injectable()
export class PasswordChangeGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const exempt = this.reflector.getAllAndOverride<boolean>(
      SKIP_PASSWORD_CHANGE_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (exempt) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();
    if (!user || user.mustChangePassword !== true) {
      return true;
    }

    throw new AppError(PASSWORD_CHANGE_REQUIRED_CODE);
  }
}
