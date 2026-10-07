import { IsEnum, IsOptional, IsString } from 'class-validator';
import { EvidenceType } from '../entities/activity-evidence.entity';

export class CreateActivityEvidenceDto {
  /** Data URL (base64) of the file to store. */
  @IsString()
  fileBase64: string;

  @IsString()
  fileName: string;

  @IsString()
  mimeType: string;

  @IsOptional()
  @IsEnum(EvidenceType)
  type?: EvidenceType;

  @IsOptional()
  @IsString()
  description?: string;
}
