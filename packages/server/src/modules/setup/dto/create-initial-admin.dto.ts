import { Transform } from 'class-transformer';
import { IsEmail, IsNotEmpty, IsString } from 'class-validator';
import {
  IsStrongPassword,
  PASSWORD_TOO_WEAK,
} from '../../../common/decorators/is-strong-password.decorator';
import { Match } from '../../../common/decorators/match.decorator';

export const PASSWORDS_DO_NOT_MATCH = 'Passwords do not match';

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
  @IsStrongPassword({ message: PASSWORD_TOO_WEAK })
  password: string;

  @IsString()
  @Match('password', { message: PASSWORDS_DO_NOT_MATCH })
  passwordConfirmation: string;
}
