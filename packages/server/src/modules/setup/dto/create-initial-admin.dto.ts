import { Transform } from 'class-transformer';
import { IsEmail, IsNotEmpty, IsString } from 'class-validator';
import { IsStrongPassword } from '../../../common/decorators/is-strong-password.decorator';
import { Match } from '../../../common/decorators/match.decorator';
import { i18nMessage } from '../../../common/errors/i18n-message';

export class CreateInitialAdminDto {
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsNotEmpty()
  fullName: string;

  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsEmail()
  email: string;

  @IsString()
  @IsStrongPassword({ message: i18nMessage('errors.PASSWORD_TOO_WEAK') })
  password: string;

  @IsString()
  @Match('password', { message: i18nMessage('errors.PASSWORDS_DO_NOT_MATCH') })
  passwordConfirmation: string;
}
