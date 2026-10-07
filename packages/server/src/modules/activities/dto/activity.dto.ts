import { PartialType } from '@nestjs/swagger';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
} from 'class-validator';
import { ActivityStatus } from '../entities/activity.entity';

export class CreateActivityDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsDateString()
  date: string;

  @IsString()
  @Matches(/^\d{2}:\d{2}$/)
  startTime: string;

  @IsString()
  @Matches(/^\d{2}:\d{2}$/)
  endTime: string;

  @IsOptional()
  @IsUUID()
  typeId?: string;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsEnum(ActivityStatus)
  status?: ActivityStatus;

  /**
   * User responsible for organizing/coordinating the activity. The client form
   * defaults it to the logged-in user. This is NOT the financial
   * responsibility: fine payments use `collectorUserId`.
   */
  @IsOptional()
  @IsUUID()
  responsibleUserId?: string;

  /**
   * User in charge of collecting this activity's fines. Fine payments snapshot
   * it as both `collector_user_id` and `responsible_user_id` of the movement.
   * The client form defaults it to the logged-in user.
   */
  @IsOptional()
  @IsUUID()
  collectorUserId?: string;

  @IsOptional()
  @IsBoolean()
  attendanceRequired?: boolean;

  @IsOptional()
  @IsBoolean()
  fineEnabled?: boolean;
}

export class UpdateActivityDto extends PartialType(CreateActivityDto) {}

export class UpdateActivityStatusDto {
  @IsEnum(ActivityStatus)
  status: ActivityStatus;

  @IsOptional()
  @IsString()
  reason?: string;
}

export class FilterActivitiesDto {
  @IsOptional()
  @IsEnum(ActivityStatus)
  status?: ActivityStatus;

  @IsOptional()
  @IsUUID()
  typeId?: string;

  @IsOptional()
  @IsUUID()
  responsibleUserId?: string;

  @IsOptional()
  @IsDateString()
  dateFrom?: string;

  @IsOptional()
  @IsDateString()
  dateTo?: string;
}
