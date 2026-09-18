import { PartialType } from '@nestjs/swagger';
import {
  IsDateString,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
} from 'class-validator';

export class CreateActivityDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsDateString()
  date: string;

  @IsString()
  @Matches(/^\d{2}:\d{2}$/)
  startTime: string;

  @IsString()
  @Matches(/^\d{2}:\d{2}$/)
  endTime: string;
}

export class UpdateActivityDto extends PartialType(CreateActivityDto) {}
