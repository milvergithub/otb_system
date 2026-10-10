import { IsNotEmpty, IsString } from 'class-validator';
import { IsStrongPassword } from '../../../common/decorators/is-strong-password.decorator';
import { Match } from '../../../common/decorators/match.decorator';
import { i18nMessage } from '../../../common/errors/i18n-message';

/**
 * Validation only — the service enforces the current-password check and
 * anti-reuse, both of which need the persisted hash.
 */
export class ChangePasswordDto {
  @IsString()
  @IsNotEmpty()
  currentPassword: string;

  @IsString()
  @IsStrongPassword({ message: i18nMessage('errors.PASSWORD_TOO_WEAK') })
  newPassword: string;

  @IsString()
  @Match('newPassword', {
    message: i18nMessage('errors.PASSWORDS_DO_NOT_MATCH'),
  })
  newPasswordConfirmation: string;
}
