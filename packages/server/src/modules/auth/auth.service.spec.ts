import 'reflect-metadata';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import * as bcrypt from 'bcrypt';
import { AuthService, JwtPayload } from './auth.service';
import {
  ChangePasswordDto,
  CURRENT_PASSWORD_INVALID,
  PASSWORD_REUSED,
} from './dto/change-password.dto';

const CURRENT_PASSWORD = 'S3cret-Pass!';
const NEXT_PASSWORD = 'An0ther-Pass!';

type MockUser = Record<string, any>;

function makeService(user: MockUser | null) {
  const usersRepository = {
    findOne: jest.fn(async () => user),
    update: jest.fn(async (_id: string, patch: Record<string, unknown>) => {
      Object.assign(user ?? {}, patch);
      return { affected: user ? 1 : 0 };
    }),
  };
  const jwtService = {
    signAsync: jest.fn(async (_payload: JwtPayload) => 'signed-token'),
  };
  const configService = { get: jest.fn(() => 'secret') };
  const rolesService = {
    getUserPermissions: jest.fn(async () => ['users.read']),
  };

  const service = new AuthService(
    usersRepository as never,
    jwtService as never,
    configService as never,
    rolesService as never,
  );
  return { service, usersRepository, jwtService };
}

function activeUser(): MockUser {
  return {
    id: 'user-1',
    email: 'user@example.com',
    role: 'user',
    password_hash: bcrypt.hashSync(CURRENT_PASSWORD, 4),
    must_change_password: true,
    is_active: true,
    roles: [{ name: 'user' }],
  };
}

function dtoOf(overrides: Partial<ChangePasswordDto> = {}): ChangePasswordDto {
  return {
    currentPassword: CURRENT_PASSWORD,
    newPassword: NEXT_PASSWORD,
    newPasswordConfirmation: NEXT_PASSWORD,
    ...overrides,
  } as ChangePasswordDto;
}

describe('AuthService.changePassword', () => {
  it('rejects a wrong current password', async () => {
    const { service } = makeService(activeUser());

    await expect(
      service.changePassword('user-1', dtoOf({ currentPassword: 'Nope123!' })),
    ).rejects.toThrow(CURRENT_PASSWORD_INVALID);
  });

  it('rejects reusing the current password', async () => {
    const { service } = makeService(activeUser());

    await expect(
      service.changePassword(
        'user-1',
        dtoOf({ newPassword: CURRENT_PASSWORD }),
      ),
    ).rejects.toThrow(PASSWORD_REUSED);
  });

  it('rejects an account that no longer exists', async () => {
    const { service } = makeService(null);

    await expect(service.changePassword('gone', dtoOf())).rejects.toThrow(
      NotFoundException,
    );
  });

  it('stores the new hash, clears the forced change and reissues tokens', async () => {
    const user = activeUser();
    const { service, usersRepository, jwtService } = makeService(user);

    const result = await service.changePassword('user-1', dtoOf());

    expect(user.must_change_password).toBe(false);
    expect(user.password_hash).not.toBe(CURRENT_PASSWORD);
    await expect(
      bcrypt.compare(NEXT_PASSWORD, user.password_hash),
    ).resolves.toBe(true);
    await expect(
      bcrypt.compare(CURRENT_PASSWORD, user.password_hash),
    ).resolves.toBe(false);

    expect(result.user).not.toHaveProperty('password_hash');
    expect((result.user as any).must_change_password).toBe(false);
    expect(result.accessToken).toBe('signed-token');
    expect(result.refreshToken).toBe('signed-token');

    // Both the access and refresh tokens must carry the cleared claim,
    // otherwise the guard would keep blocking after a successful change.
    const claims = jwtService.signAsync.mock.calls.map(
      (call) => (call[0] as unknown as JwtPayload).mustChangePassword,
    );
    expect(claims).toEqual([false, false]);
    expect(usersRepository.update).toHaveBeenCalledTimes(1);
  });

  it('does not leak the hash or the flag through the returned user', async () => {
    const { service } = makeService(activeUser());

    const { user } = await service.changePassword('user-1', dtoOf());

    expect(user).not.toHaveProperty('password_hash');
  });
});

describe('ChangePasswordDto validation', () => {
  async function errorsFor(payload: Record<string, unknown>) {
    const dto = plainToInstance(ChangePasswordDto, payload);
    return (await validate(dto)).map((e) => e.property);
  }

  it('accepts a payload that meets the strength policy', async () => {
    await expect(
      errorsFor({
        currentPassword: CURRENT_PASSWORD,
        newPassword: NEXT_PASSWORD,
        newPasswordConfirmation: NEXT_PASSWORD,
      }),
    ).resolves.toEqual([]);
  });

  it('rejects a confirmation that does not match', async () => {
    await expect(
      errorsFor({
        currentPassword: CURRENT_PASSWORD,
        newPassword: NEXT_PASSWORD,
        newPasswordConfirmation: 'An0ther-Pass?',
      }),
    ).resolves.toEqual(['newPasswordConfirmation']);
  });

  it('rejects a new password that fails the strength policy', async () => {
    await expect(
      errorsFor({
        currentPassword: CURRENT_PASSWORD,
        newPassword: 'alllowercase',
        newPasswordConfirmation: 'alllowercase',
      }),
    ).resolves.toEqual(['newPassword']);
  });
});
