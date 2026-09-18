import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator';

export class CreateZoneDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  type?: string;

  @IsNotEmpty()
  geometry: Record<string, unknown>;

  @IsOptional()
  @IsString()
  color?: string;

  @IsOptional()
  @IsUUID()
  zone_type_id?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10)
  line_width?: number;
}

export class UpdateZoneDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  type?: string;

  @IsOptional()
  geometry?: Record<string, unknown>;

  @IsOptional()
  @IsString()
  color?: string;

  @IsOptional()
  @IsUUID()
  zone_type_id?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10)
  line_width?: number;
}
