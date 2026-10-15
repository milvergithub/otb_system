import {
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { SurchargeType } from '../entities/surcharge.entity';

export class CreateSurchargeDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsEnum(SurchargeType)
  @IsOptional()
  type?: SurchargeType;

  @IsNumber()
  @Min(0)
  value: number;

  @IsString()
  @IsOptional()
  description?: string;

  @IsBoolean()
  @IsOptional()
  is_active?: boolean;

  @IsBoolean()
  @IsOptional()
  is_default?: boolean;
}

export class UpdateSurchargeDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsEnum(SurchargeType)
  @IsOptional()
  type?: SurchargeType;

  @IsNumber()
  @Min(0)
  @IsOptional()
  value?: number;

  @IsString()
  @IsOptional()
  description?: string;

  @IsBoolean()
  @IsOptional()
  is_active?: boolean;

  @IsBoolean()
  @IsOptional()
  is_default?: boolean;
}
