import { PartialType } from '@nestjs/swagger';
import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';
import { AssetDocumentKind } from '../entities/asset-document.entity';

export class UploadAssetDocumentDto {
  @IsString()
  @IsNotEmpty()
  fileBase64: string;

  @IsOptional()
  @IsString()
  fileName?: string;

  @IsOptional()
  @IsEnum(AssetDocumentKind)
  kind?: AssetDocumentKind;
}

export class UpdateAssetDocumentDto extends PartialType(
  UploadAssetDocumentDto,
) {}
