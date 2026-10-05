import { IsEnum, IsOptional, IsString, IsUUID } from 'class-validator';
import { PaginationDto } from '../../../common/dto/pagination.dto';
import {
  AssetAcquisitionType,
  AssetCondition,
  AssetStatus,
} from '../entities/asset.entity';

export class FilterAssetDto extends PaginationDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @IsOptional()
  @IsUUID()
  locationId?: string;

  @IsOptional()
  @IsEnum(AssetStatus)
  status?: AssetStatus;

  @IsOptional()
  @IsEnum(AssetCondition)
  condition?: AssetCondition;

  @IsOptional()
  @IsEnum(AssetAcquisitionType)
  acquisitionType?: AssetAcquisitionType;

  @IsOptional()
  @IsUUID()
  responsibleMemberId?: string;

  @IsOptional()
  @IsUUID()
  responsibleUserId?: string;
}
