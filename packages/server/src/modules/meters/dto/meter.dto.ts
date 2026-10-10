import { PartialType } from '@nestjs/swagger';
import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';
import { MeterStatus } from '../entities/meter.entity';

export class CreateMeterDto {
  @IsString()
  @IsNotEmpty()
  code: string;

  @IsString()
  @IsNotEmpty()
  memberId: string;

  @IsString()
  @IsNotEmpty()
  address: string;

  @IsOptional()
  @IsNumber()
  latitude?: number;

  @IsOptional()
  @IsNumber()
  longitude?: number;

  @IsOptional()
  @IsUUID()
  typeId?: string;

  @IsOptional()
  @IsEnum(MeterStatus)
  status?: MeterStatus;

  @IsOptional()
  @IsNumber()
  @Min(0.01)
  shareAmount?: number;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  sharePaymentMethod?: string;

  @IsOptional()
  @IsString()
  shareReference?: string;

  @IsOptional()
  @IsString()
  shareNotes?: string;

  @IsOptional()
  @IsString()
  shareEvidenceBase64?: string;
}

export class UpdateMeterDto extends PartialType(CreateMeterDto) {}
