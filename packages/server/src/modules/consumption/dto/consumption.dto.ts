import {
  IsInt,
  IsNotEmpty,
  IsNumber,
  Max,
  Min,
  IsOptional,
  IsString,
} from 'class-validator';

export class CreateConsumptionDto {
  @IsNotEmpty()
  meterId: string;

  @IsInt()
  @Min(1)
  @Max(12)
  month: number;

  @IsInt()
  @Min(2000)
  @Max(2100)
  year: number;

  @IsNumber()
  @Min(0)
  currentReading: number;

  @IsOptional()
  @IsString()
  imageBase64?: string;
}
