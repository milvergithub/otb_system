import { Type } from 'class-transformer';
import {
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { AssetCondition } from '../entities/asset.entity';

export class CreateAssetMaintenanceDto {
  @IsString()
  @IsNotEmpty()
  reason: string;

  @IsOptional()
  @IsDateString()
  startedAt?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  cost?: number;

  @IsOptional()
  @IsString()
  provider?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class FinishAssetMaintenanceDto {
  @IsOptional()
  @IsDateString()
  finishedAt?: string;

  @IsOptional()
  @IsEnum(AssetCondition)
  condition?: AssetCondition;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  cost?: number;

  @IsOptional()
  @IsString()
  provider?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
