import { Transform } from 'class-transformer';
import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';
import { Match } from './match.decorator';

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
  @MinLength(6)
  password: string;

  @IsString()
  @Match('password', { message: PASSWORDS_DO_NOT_MATCH })
  passwordConfirmation: string;
}
