import {
  IsDateString,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';
import { PaymentMethod } from '../../billing/entities/payment-history.entity';

export class CreateSharePaymentDto {
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
  @IsDateString()
  paidAt?: string;

  @IsOptional()
  @IsString()
  evidenceBase64?: string;

  /**
   * User that physically collected the money. Optional: when omitted the
   * authenticated registrant is assumed to be the collector.
   */
  @IsOptional()
  @IsUUID()
  collectorUserId?: string;
}
