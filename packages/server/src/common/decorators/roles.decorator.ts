import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';
export const Roles = (...permissions: string[]) =>
  SetMetadata(ROLES_KEY, permissions);

export const ANY_ROLES_KEY = 'anyRoles';
export const AnyRoles = (...permissions: string[]) =>
  SetMetadata(ANY_ROLES_KEY, permissions);
