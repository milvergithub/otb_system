import { PartialType } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
} from 'class-validator';
import { PaginationDto } from '../../../common/dto/pagination.dto';
import {
  FinanceSourceType,
  FinanceTransactionStatus,
  FinanceTransactionType,
} from '../entities/finance-transaction.entity';
import { PaymentMethod } from '../../billing/entities/payment-history.entity';

/**
 * Visibility scope for finance queries. `mine` = movements where the requester
 * is the financial responsible; `all` requires the `finances.all` permission
 * (which grants visibility, never financial responsibility).
 */
export enum FinanceScope {
  MINE = 'mine',
  ALL = 'all',
}

export class CreateFinanceTransactionDto {
  @IsEnum(FinanceTransactionType)
  type: FinanceTransactionType;

  @IsDateString()
  date: string;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @IsPositive()
  amount: number;

  @IsString()
  @IsNotEmpty()
  concept: string;

  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @IsOptional()
  @IsEnum(PaymentMethod)
  paymentMethod?: PaymentMethod;

  @IsOptional()
  @IsString()
  reference?: string;

  @IsOptional()
  @IsUUID()
  memberId?: string;

  @IsOptional()
  @IsEnum(FinanceSourceType)
  sourceType?: FinanceSourceType;

  @IsOptional()
  @IsString()
  sourceId?: string;

  @IsOptional()
  @IsUUID()
  userId?: string;

  /**
   * Financially responsible user. Never defaulted to the authenticated user:
   * only `finances.all` may assign an arbitrary responsible, otherwise the
   * value must be the requester's own id (or omitted).
   * NOTE: `registeredByUserId` is intentionally absent from this DTO — it is
   * always taken from the authenticated context.
   */
  @IsOptional()
  @IsUUID()
  responsibleUserId?: string;

  /** User that physically collected the money (optional). */
  @IsOptional()
  @IsUUID()
  collectorUserId?: string;

  @IsOptional()
  @IsString()
  provider?: string;

  @IsOptional()
  @IsUUID()
  assetId?: string;

  @IsOptional()
  @IsUUID()
  activityId?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateFinanceTransactionDto extends PartialType(
  CreateFinanceTransactionDto,
) {}

export class VoidFinanceTransactionDto {
  @IsOptional()
  @IsString()
  reason?: string;
}

export class FilterFinanceDto extends PaginationDto {
  @IsOptional()
  @IsEnum(FinanceTransactionType)
  type?: FinanceTransactionType;

  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @IsOptional()
  @Transform(({ value }) => {
    if (value === undefined || value === null || value === '') return undefined;
    const raw = Array.isArray(value) ? value : String(value).split(',');
    const cleaned = raw.map((v: unknown) => String(v).trim()).filter(Boolean);
    return cleaned.length > 0 ? cleaned : undefined;
  })
  @IsArray()
  @IsUUID('4', { each: true })
  categoryIds?: string[];

  @IsOptional()
  @IsUUID()
  memberId?: string;

  @IsOptional()
  @IsUUID()
  userId?: string;

  @IsOptional()
  @IsUUID()
  responsibleUserId?: string;

  @IsOptional()
  @IsUUID()
  collectorUserId?: string;

  @IsOptional()
  @IsUUID()
  registeredByUserId?: string;

  /**
   * Visibility scope: `mine` limits the result to the requester's financial
   * responsibility. Without `finances.all` the scope is always forced to
   * `mine` server-side, regardless of the value sent by the client.
   */
  @IsOptional()
  @IsEnum(FinanceScope)
  scope?: FinanceScope;

  @IsOptional()
  @IsEnum(FinanceTransactionStatus)
  status?: FinanceTransactionStatus;

  @IsOptional()
  @IsUUID()
  assetId?: string;

  @IsOptional()
  @IsUUID()
  activityId?: string;

  @IsOptional()
  @IsEnum(FinanceSourceType)
  sourceType?: FinanceSourceType;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @IsOptional()
  @IsDateString()
  dateTo?: string;
}

export class FinanceReportsFilterDto {
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;

  @IsOptional()
  @IsEnum(FinanceTransactionType)
  type?: FinanceTransactionType;

  @IsOptional()
  @IsUUID()
  responsibleUserId?: string;

  @IsOptional()
  @IsUUID()
  collectorUserId?: string;

  @IsOptional()
  @IsUUID()
  registeredByUserId?: string;

  @IsOptional()
  @IsEnum(FinanceScope)
  scope?: FinanceScope;
}
