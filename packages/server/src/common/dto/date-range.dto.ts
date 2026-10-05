import { IsDateString, IsOptional } from 'class-validator';

/**
 * Inclusive date range filter shared by report endpoints.
 * `endDate` is normalized to the end of the day by the consuming service.
 */
export class DateRangeDto {
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @IsOptional()
  @IsDateString()
  endDate?: string;
}
