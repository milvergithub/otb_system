import {
  IsArray,
  IsEnum,
  IsOptional,
  IsUUID,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class ControlAttendanceDto {
  @IsArray()
  @IsUUID('4', { each: true })
  memberIds: string[];

  /**
   * Members marked as excused on the final control. They are treated as
   * absent for the presence statistics but never generate a fine.
   */
  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  excusedMemberIds?: string[];
}

export enum BulkAttendanceSession {
  INITIAL = 'initial',
  FINAL = 'final',
}

export enum BulkAttendanceStatus {
  PRESENT = 'present',
  ABSENT = 'absent',
  /** Only meaningful on the final control: member did not attend but is excused. */
  EXCUSED = 'excused',
}

export class BulkAttendanceEntryDto {
  @IsUUID('4')
  memberId: string;

  @IsEnum(BulkAttendanceStatus)
  status: BulkAttendanceStatus;
}

export class BulkAttendanceDto {
  @IsEnum(BulkAttendanceSession)
  session: BulkAttendanceSession;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BulkAttendanceEntryDto)
  attendance: BulkAttendanceEntryDto[];
}
