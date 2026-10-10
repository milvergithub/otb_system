import { PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
} from 'class-validator';
import { PaginationDto } from '../../../common/dto/pagination.dto';
import { ContributionStatus } from '../entities/contribution.entity';
import { ContributionObligationStatus } from '../entities/contribution-obligation.entity';

export class CreateContributionDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsOptional()
  @IsString()
  purpose?: string;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  amountPerMember: number;

  /** User in charge of collecting payments. Optional at API level. */
  @IsOptional()
  @IsUUID()
  collectorUserId?: string;

  /** User accountable for the rendición de cuentas. Optional at API level. */
  @IsOptional()
  @IsUUID()
  responsibleUserId?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateContributionDto extends PartialType(CreateContributionDto) {}

export class AddMembersDto {
  /**
   * Explicit member selection. Either this or `allActive` must be provided.
   * `createdByUserId` is never accepted: inclusion is attributed to the
   * authenticated user.
   */
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  memberIds?: string[];

  /** Include every member of the system (minus `excludeMemberIds`). */
  @IsOptional()
  @IsBoolean()
  allActive?: boolean;

  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  excludeMemberIds?: string[];
}

export class ExonerateObligationDto {
  @IsString()
  @IsNotEmpty()
  reason: string;
}

export class CancelObligationDto {
  @IsOptional()
  @IsString()
  reason?: string;
}

export class CancelContributionDto {
  @IsOptional()
  @IsString()
  reason?: string;
}

export class PayContributionDto {
  @IsUUID('4')
  obligationId: string;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  amount: number;

  @IsOptional()
  @IsString()
  @MaxLength(50)
  paymentMethod?: string;

  @IsOptional()
  @IsString()
  reference?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  /** Object storage evidence (image or PDF data URL), stored as a key only. */
  @IsOptional()
  @IsString()
  @Matches(/^data:(image\/|application\/pdf)/)
  evidenceBase64?: string;

  /** Original file name, used to build the storage key. */
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  evidenceFileName?: string;

  /**
   * User that physically received the money. Optional: defaults to the
   * campaign collector, then to the authenticated registrant. The financial
   * responsible always comes from the campaign's `responsible_user_id`.
   */
  @IsOptional()
  @IsUUID()
  collectorUserId?: string;
}

export class VoidContributionPaymentDto {
  @IsString()
  @IsNotEmpty()
  reason: string;
}

export class FilterContributionsDto extends PaginationDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsEnum(ContributionStatus)
  status?: ContributionStatus;

  @IsOptional()
  @IsUUID()
  collectorUserId?: string;

  @IsOptional()
  @IsUUID()
  responsibleUserId?: string;
}

export class FilterObligationsDto extends PaginationDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsEnum(ContributionObligationStatus)
  status?: ContributionObligationStatus;
}
