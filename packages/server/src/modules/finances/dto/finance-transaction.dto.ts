import { PartialType } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
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
  FinanceTransactionType,
} from '../entities/finance-transaction.entity';
import { PaymentMethod } from '../../billing/entities/payment-history.entity';

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

  @IsOptional()
  @IsString()
  provider?: string;

  @IsOptional()
  @IsUUID()
  assetId?: string;

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
  @IsUUID()
  memberId?: string;

  @IsOptional()
  @IsUUID()
  userId?: string;

  @IsOptional()
  @IsUUID()
  assetId?: string;

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
}
