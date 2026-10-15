import {
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
} from 'class-validator';
import { PaymentStatus } from '../entities/payment.entity';

export class PayBillDto {
  @IsNumber()
  @Min(0)
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

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  discountIds?: string[];

  /**
   * Explicit late-fee surcharge selection (ids chosen by the user).
   * Generate: omitted field = legacy behaviour (all default active surcharges
   * when eligible); empty array = none.
   * Pay: applied only to bills that were generated WITHOUT surcharges; bills
   * that already carry persisted surcharges are never rewritten.
   */
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  surchargeIds?: string[];

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

  /**
   * Explicit late-fee surcharge selection (ids chosen by the user). Omitting
   * the field keeps the legacy behaviour: every default active surcharge is
   * applied when the bill is eligible. An empty array applies none.
   */
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  surchargeIds?: string[];
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
