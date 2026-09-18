import {
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { DiscountType } from '../entities/discount.entity';

export class CreateDiscountDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsEnum(DiscountType)
  @IsOptional()
  type?: DiscountType;

  @Min(0)
  value: number;

  @IsString()
  @IsOptional()
  description?: string;

  @IsBoolean()
  @IsOptional()
  is_active?: boolean;
}

export class UpdateDiscountDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsEnum(DiscountType)
  @IsOptional()
  type?: DiscountType;

  @Min(0)
  @IsOptional()
  value?: number;

  @IsString()
  @IsOptional()
  description?: string;

  @IsBoolean()
  @IsOptional()
  is_active?: boolean;
}
