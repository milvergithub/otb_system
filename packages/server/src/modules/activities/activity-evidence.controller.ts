import { Body, Controller, Delete, Get, Param, Post } from '@nestjs/common';
import { AnyRoles, Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthUser } from '../auth/interfaces/auth-user.interface';
import { ActivityEvidenceService } from './activity-evidence.service';
import { CreateActivityEvidenceDto } from './dto/activity-evidence.dto';

@Controller('activities/:activityId/evidence')
export class ActivityEvidenceController {
  constructor(private readonly service: ActivityEvidenceService) {}

  @Get()
  @Roles('activities.read')
  findAll(@Param('activityId') activityId: string) {
    return this.service.findAll(activityId);
  }

  @Post()
  @AnyRoles('activities.manageEvidence', 'activities.update')
  create(
    @Param('activityId') activityId: string,
    @Body() dto: CreateActivityEvidenceDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.create(activityId, dto, user.id);
  }

  @Delete(':evidenceId')
  @AnyRoles('activities.manageEvidence', 'activities.update')
  remove(
    @Param('activityId') activityId: string,
    @Param('evidenceId') evidenceId: string,
  ) {
    return this.service.remove(activityId, evidenceId);
  }
}
