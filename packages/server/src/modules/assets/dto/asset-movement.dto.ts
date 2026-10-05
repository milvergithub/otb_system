import {
  IsDateString,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

/**
 * A loan needs a destination and a responsible party. At least one of
 * `responsibleUserId` / `responsibleMemberId` is required (validated in the
 * service so the error message stays explicit).
 */
export class LoanAssetDto {
  @IsOptional()
  @IsUUID()
  toLocationId?: string;

  @IsOptional()
  @IsUUID()
  responsibleUserId?: string;

  @IsOptional()
  @IsUUID()
  responsibleMemberId?: string;

  @IsString()
  @IsNotEmpty()
  motive: string;

  @IsOptional()
  @IsDateString()
  movedAt?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class ReturnAssetDto {
  @IsOptional()
  @IsUUID()
  returnLocationId?: string;

  @IsOptional()
  @IsDateString()
  returnedAt?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class TransferAssetDto {
  @IsUUID()
  toLocationId: string;

  @IsOptional()
  @IsString()
  motive?: string;

  @IsOptional()
  @IsDateString()
  movedAt?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
