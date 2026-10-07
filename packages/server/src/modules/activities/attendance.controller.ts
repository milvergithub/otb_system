import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { AnyRoles, Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthUser } from '../auth/interfaces/auth-user.interface';
import { BulkAttendanceDto, ControlAttendanceDto } from './dto/attendance.dto';
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
  @AnyRoles('activities.manageAttendance', 'activities.update')
  saveInitialControl(
    @Param('activityId') activityId: string,
    @Body() dto: ControlAttendanceDto,
    @CurrentUser('id') userId?: string,
  ) {
    return this.service.saveInitialControl(activityId, dto, userId);
  }

  @Post(':activityId/attendance/final-control')
  @AnyRoles('activities.manageAttendance', 'activities.update')
  saveFinalControl(
    @Param('activityId') activityId: string,
    @Body() dto: ControlAttendanceDto,
    @CurrentUser('id') userId?: string,
  ) {
    return this.service.saveFinalControl(activityId, dto, userId);
  }

  @Post(':activityId/attendance/bulk')
  @AnyRoles('activities.manageAttendance', 'activities.update')
  saveBulk(
    @Param('activityId') activityId: string,
    @Body() dto: BulkAttendanceDto,
    @CurrentUser('id') userId?: string,
  ) {
    return this.service.saveBulk(activityId, dto, userId);
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
