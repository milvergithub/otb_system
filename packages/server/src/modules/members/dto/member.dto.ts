import { PartialType } from '@nestjs/swagger';
import { IsBoolean, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class ImportMembersDto {
  @IsString()
  @IsNotEmpty()
  csvContent: string;

  @IsOptional()
  @IsBoolean()
  sendWelcome?: boolean;
}

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

  @IsOptional()
  @IsString()
  memberTypeId?: string | null;
}

export class UpdateMemberDto extends PartialType(CreateMemberDto) {}
