import { PartialType } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { FineTypeAppliesTo } from '../entities/fine-type.entity';

export class CreateFineTypeDto {
  /**
   * Free-form identifier (legacy rows use absent_start / absent_end /
   * absent_both). The attendance evaluation matches on `appliesTo`, so the code
   * no longer has to be one of the legacy values.
   */
  @IsString()
  @IsNotEmpty()
  code: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsNumber()
  @Min(0)
  amount: number;

  /**
   * Which attendance result this fine type applies to (absent, late,
   * left_early) or `manual` for fines issued by hand.
   */
  @IsOptional()
  @IsEnum(FineTypeAppliesTo)
  appliesTo?: FineTypeAppliesTo;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateFineTypeDto extends PartialType(CreateFineTypeDto) {}
