import { PartialType } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';
import { FinanceCategoryType } from '../entities/finance-category.entity';

export class CreateFinanceCategoryDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsOptional()
  @IsEnum(FinanceCategoryType)
  type?: FinanceCategoryType;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateFinanceCategoryDto extends PartialType(
  CreateFinanceCategoryDto,
) {}
