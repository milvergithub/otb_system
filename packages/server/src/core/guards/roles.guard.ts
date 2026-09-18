import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../../common/decorators/roles.decorator';
import { ANY_ROLES_KEY } from '../../common/decorators/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    const anyPermissions = this.reflector.getAllAndOverride<string[]>(
      ANY_ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredPermissions && !anyPermissions) {
      return true;
    }

    const { user } = context.switchToHttp().getRequest();
    if (!user || !user.permissions) {
      throw new ForbiddenException('Insufficient permissions');
    }

    if (requiredPermissions && requiredPermissions.length > 0) {
      const hasAll = requiredPermissions.every((perm) =>
        user.permissions.includes(perm),
      );
      if (!hasAll) {
        throw new ForbiddenException('Insufficient permissions');
      }
      return true;
    }

    if (anyPermissions && anyPermissions.length > 0) {
      const hasAny = anyPermissions.some((perm) =>
        user.permissions.includes(perm),
      );
      if (!hasAny) {
        throw new ForbiddenException('Insufficient permissions');
      }
      return true;
    }

    return true;
  }
}
