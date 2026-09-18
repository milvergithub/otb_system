import { IsArray, IsUUID } from 'class-validator';

export class ControlAttendanceDto {
  @IsArray()
  @IsUUID('4', { each: true })
  memberIds: string[];
}
