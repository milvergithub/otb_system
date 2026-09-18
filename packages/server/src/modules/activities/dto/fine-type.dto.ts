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
import { FineTypeCode } from '../entities/fine-type.entity';

export class CreateFineTypeDto {
  @IsEnum(FineTypeCode)
  code: FineTypeCode;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsNumber()
  @Min(0)
  amount: number;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

export class UpdateFineTypeDto extends PartialType(CreateFineTypeDto) {}
