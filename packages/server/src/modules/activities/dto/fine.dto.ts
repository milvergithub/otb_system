import {
  ArrayNotEmpty,
  IsArray,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

export class PayFineDto {
  @IsOptional()
  @IsString()
  notes?: string;
}

export class CancelFineDto {
  @IsOptional()
  @IsString()
  reason?: string;
}

export class BulkPayFinesDto {
  @IsArray()
  @ArrayNotEmpty()
  @IsUUID('4', { each: true })
  ids: string[];

  @IsOptional()
  @IsString()
  notes?: string;
}
