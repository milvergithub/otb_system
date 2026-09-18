import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsBoolean,
  MinLength,
  IsArray,
} from 'class-validator';

export class CreateUserDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(6)
  password: string;

  @IsString()
  @IsNotEmpty()
  fullName: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  roleIds?: string[];
}

export class UpdateUserDto {
  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  @MinLength(6)
  password?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  fullName?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  roleIds?: string[];
}

export class ToggleUserActiveDto {
  @IsBoolean()
  isActive: boolean;
}
