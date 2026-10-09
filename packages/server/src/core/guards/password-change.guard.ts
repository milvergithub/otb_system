import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { SKIP_PASSWORD_CHANGE_KEY } from '../../common/decorators/skip-password-change.decorator';

export const PASSWORD_CHANGE_REQUIRED = 'Password change required';
export const PASSWORD_CHANGE_REQUIRED_CODE = 'PASSWORD_CHANGE_REQUIRED';

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

    throw new ForbiddenException({
      statusCode: 403,
      error: 'Forbidden',
      message: PASSWORD_CHANGE_REQUIRED,
      code: PASSWORD_CHANGE_REQUIRED_CODE,
    });
  }
}
