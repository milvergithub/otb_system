import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class CreatePaymentMethodDto {
  @IsNotEmpty()
  @IsString()
  @MaxLength(30)
  code: string;

  @IsNotEmpty()
  @IsString()
  @MaxLength(50)
  name: string;
}

export class UpdatePaymentMethodDto {
  @IsOptional()
  @IsString()
  @MaxLength(50)
  name?: string;
}
