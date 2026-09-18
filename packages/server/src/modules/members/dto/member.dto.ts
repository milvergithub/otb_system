import { PartialType } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateMemberDto {
  @IsString()
  @IsNotEmpty()
  ci: string;

  @IsString()
  @IsNotEmpty()
  firstName: string;

  @IsString()
  @IsNotEmpty()
  lastName: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  phoneCountry?: string;

  @IsOptional()
  @IsString()
  address?: string;
}

export class UpdateMemberDto extends PartialType(CreateMemberDto) {}
