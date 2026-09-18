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

export class CreateTariffDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsNumber()
  @Min(0)
  minCubicMeters: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  maxCubicMeters?: number;

  @IsNumber()
  @Min(0)
  pricePerCubicMeter: number;

  @IsDateString()
  validFrom: string;

  @IsOptional()
  @IsDateString()
  validUntil?: string;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateTariffDto extends PartialType(CreateTariffDto) {}
