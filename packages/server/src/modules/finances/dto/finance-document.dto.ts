import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { FinanceDocumentKind } from '../entities/finance-document.entity';

export class AddFinanceDocumentDto {
  @IsString()
  @IsNotEmpty()
  fileBase64: string;

  @IsOptional()
  @IsString()
  fileName?: string;

  @IsOptional()
  @IsEnum(FinanceDocumentKind)
  kind?: FinanceDocumentKind;
}
