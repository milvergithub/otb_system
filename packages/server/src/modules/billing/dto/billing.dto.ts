import {
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
import { PaymentMethod } from '../entities/payment-history.entity';
import { PaymentStatus } from '../entities/payment.entity';

export class PayBillDto {
  @IsNumber()
  @Min(0.01)
  amount: number;

  @IsOptional()
  @IsEnum(PaymentMethod)
  paymentMethod?: PaymentMethod;

  @IsOptional()
  @IsString()
  reference?: string;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  discountIds?: string[];

  @IsOptional()
  @IsString()
  evidenceBase64?: string;
}

export class GenerateBillDto {
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  discountIds?: string[];
}

export class BillingQueryDto {
  @IsOptional()
  month?: number;

  @IsOptional()
  year?: number;

  @IsOptional()
  @IsEnum(PaymentStatus)
  status?: PaymentStatus;

  @IsOptional()
  @IsString()
  search?: string;
}
