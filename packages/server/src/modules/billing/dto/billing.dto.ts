import {
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
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

  /**
   * User that physically collected the money. Optional: when omitted the
   * authenticated registrant is assumed to be the collector.
   * `registeredByUserId` and `responsibleUserId` are never accepted here —
   * they are resolved server-side.
   */
  @IsOptional()
  @IsUUID()
  collectorUserId?: string;
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
