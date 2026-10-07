import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { AnyRoles, Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthUser } from '../auth/interfaces/auth-user.interface';
import { CreateManualFineDto } from './dto/fine.dto';
import { FinesService } from './fines.service';

@Controller('activities/:activityId/fines')
export class ActivityFinesController {
  constructor(private readonly service: FinesService) {}

  @Get()
  @Roles('activities.read')
  findAll(
    @Param('activityId') activityId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.findAll(
      { activityId },
      user.id,
      user.permissions.includes('activities.all'),
    );
  }

  @Post()
  @AnyRoles('activities.manageFines', 'activities.update')
  create(
    @Param('activityId') activityId: string,
    @Body() dto: CreateManualFineDto,
    @CurrentUser('id') userId?: string,
  ) {
    return this.service.createManual(activityId, dto, userId);
  }
}
