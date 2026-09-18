import { PartialType } from '@nestjs/swagger';
import {
  IsBoolean,
  IsDateString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class CreateWaterShareDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsNumber()
  @Min(0)
  amount: number;

  @IsDateString()
  validFrom: string;

  @IsOptional()
  @IsDateString()
  validUntil?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateWaterShareDto extends PartialType(CreateWaterShareDto) {}
