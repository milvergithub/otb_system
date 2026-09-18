import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsInt,
  Min,
  Max,
} from 'class-validator';

export class CreateZoneTypeDto {
  @IsNotEmpty()
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  default_color?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10)
  default_line_width?: number;
}

export class UpdateZoneTypeDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  default_color?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10)
  default_line_width?: number;
}
