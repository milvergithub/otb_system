import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { Roles } from '../../common/decorators/roles.decorator';
import { ControlAttendanceDto } from './dto/attendance.dto';
import { AttendanceService } from './attendance.service';

@Controller('activities')
export class AttendanceController {
  constructor(private readonly service: AttendanceService) {}

  @Get(':activityId/attendance')
  @Roles('activities.read')
  findByActivity(@Param('activityId') activityId: string) {
    return this.service.findByActivity(activityId);
  }

  @Post(':activityId/attendance/initial-control')
  @Roles('activities.create')
  saveInitialControl(
    @Param('activityId') activityId: string,
    @Body() dto: ControlAttendanceDto,
  ) {
    return this.service.saveInitialControl(activityId, dto);
  }

  @Post(':activityId/attendance/final-control')
  @Roles('activities.create')
  saveFinalControl(
    @Param('activityId') activityId: string,
    @Body() dto: ControlAttendanceDto,
  ) {
    return this.service.saveFinalControl(activityId, dto);
  }

  @Get('attendance')
  @Roles('activities.read')
  findAll(
    @Query('memberId') memberId?: string,
    @Query('activityId') activityId?: string,
    @Query('status') status?: string,
  ) {
    return this.service.findAll({ memberId, activityId, status });
  }

  @Get('attendance/member/:memberId/summary/:activityId')
  @Roles('activities.read')
  getMemberSummary(
    @Param('memberId') memberId: string,
    @Param('activityId') activityId: string,
  ) {
    return this.service.getMemberAttendanceSummary(memberId, activityId);
  }
}
