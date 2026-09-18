import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateMeterTypeDto {
  @IsNotEmpty()
  @IsString()
  name: string;
}

export class UpdateMeterTypeDto {
  @IsOptional()
  @IsString()
  name?: string;
}
