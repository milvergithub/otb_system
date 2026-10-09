import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import {
  PASSWORD_CHANGE_REQUIRED_CODE,
  PasswordChangeGuard,
} from './password-change.guard';
import { SKIP_PASSWORD_CHANGE_KEY } from '../../common/decorators/skip-password-change.decorator';

function makeContext(user: unknown): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
    getHandler: () => Object,
    getClass: () => Object,
  } as unknown as ExecutionContext;
}

function makeGuard(overrides: Record<string, unknown> = {}) {
  const reflector = {
    getAllAndOverride: jest.fn((key: string) =>
      key in overrides ? overrides[key] : false,
    ),
  } as unknown as Reflector;
  return new PasswordChangeGuard(reflector);
}

describe('PasswordChangeGuard', () => {
  it('blocks an authenticated request that still holds a temporary password', () => {
    const guard = makeGuard();

    expect(() =>
      guard.canActivate(makeContext({ mustChangePassword: true })),
    ).toThrow(ForbiddenException);

    try {
      guard.canActivate(makeContext({ mustChangePassword: true }));
    } catch (err) {
      const body = (err as ForbiddenException).getResponse() as Record<
        string,
        unknown
      >;
      expect(body.code).toBe(PASSWORD_CHANGE_REQUIRED_CODE);
      expect(body.statusCode).toBe(403);
    }
  });

  it('lets through a request whose password has already been changed', () => {
    const guard = makeGuard();
    expect(guard.canActivate(makeContext({ mustChangePassword: false }))).toBe(
      true,
    );
    expect(guard.canActivate(makeContext({}))).toBe(true);
  });

  it('lets through unauthenticated and public requests', () => {
    const guard = makeGuard();
    expect(guard.canActivate(makeContext(undefined))).toBe(true);
  });

  it('lets through routes explicitly exempted by decorator', () => {
    const guard = makeGuard({ [SKIP_PASSWORD_CHANGE_KEY]: true });
    expect(guard.canActivate(makeContext({ mustChangePassword: true }))).toBe(
      true,
    );
  });

  it('treats tokens minted before the claim existed as non-blocked', () => {
    const guard = makeGuard();
    expect(
      guard.canActivate(makeContext({ mustChangePassword: undefined })),
    ).toBe(true);
    expect(guard.canActivate(makeContext({ mustChangePassword: 'yes' }))).toBe(
      true,
    );
  });
});
