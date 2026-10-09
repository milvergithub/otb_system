import { IsNotEmpty, IsString } from 'class-validator';
import {
  IsStrongPassword,
  PASSWORD_TOO_WEAK,
} from '../../../common/decorators/is-strong-password.decorator';
import { Match } from '../../../common/decorators/match.decorator';

export const CURRENT_PASSWORD_INVALID = 'Current password is incorrect';

export const PASSWORD_REUSED = 'New password must differ from the current one';

export const PASSWORDS_DO_NOT_MATCH = 'Passwords do not match';

/**
 * Validation only — the service enforces the current-password check and
 * anti-reuse, both of which need the persisted hash.
 */
export class ChangePasswordDto {
  @IsString()
  @IsNotEmpty()
  currentPassword: string;

  @IsString()
  @IsStrongPassword({ message: PASSWORD_TOO_WEAK })
  newPassword: string;

  @IsString()
  @Match('newPassword', { message: PASSWORDS_DO_NOT_MATCH })
  newPasswordConfirmation: string;
}
