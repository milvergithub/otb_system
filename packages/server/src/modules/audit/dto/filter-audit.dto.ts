import { IsEnum, IsOptional, IsString, IsDateString } from 'class-validator';
import { PaginationDto } from '../../../common/dto/pagination.dto';
import { AuditAction } from '../entities/audit-log.entity';

export class FilterAuditDto extends PaginationDto {
  @IsOptional()
  @IsString()
  entity?: string;

  @IsOptional()
  @IsEnum(AuditAction)
  action?: AuditAction;

  @IsOptional()
  @IsString()
  userId?: string;

  @IsOptional()
  @IsString()
  entityId?: string;

  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @IsOptional()
  @IsDateString()
  dateTo?: string;
}
