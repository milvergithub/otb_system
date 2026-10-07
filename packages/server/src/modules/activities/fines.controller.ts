import { Body, Controller, Get, Param, Patch, Query } from '@nestjs/common';
import { Roles, AnyRoles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthUser } from '../auth/interfaces/auth-user.interface';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { PayFineDto, CancelFineDto, BulkPayFinesDto } from './dto/fine.dto';
import { FinesService } from './fines.service';

@Controller('fines')
export class FinesController {
  constructor(private readonly service: FinesService) {}

  @Get()
  @AnyRoles('activities.read', 'members.viewFines')
  findAll(
    @CurrentUser() user: AuthUser,
    @Query('memberId') memberId?: string,
    @Query('status') status?: string,
    @Query('search') search?: string,
    @Query('activityId') activityId?: string,
  ) {
    const canViewAll = user.permissions.includes('activities.all');
    return this.service.findAll(
      { memberId, status: status as any, search, activityId },
      user.id,
      canViewAll,
    );
  }

  @Get('stats')
  @AnyRoles('activities.read', 'members.viewFines')
  getStats(
    @CurrentUser() user: AuthUser,
    @Query('memberId') memberId?: string,
  ) {
    const canViewAll = user.permissions.includes('activities.all');
    return this.service.getStats({ memberId }, user.id, canViewAll);
  }

  @Get('report')
  @Roles('activities.read')
  findAllReport(
    @CurrentUser() user: AuthUser,
    @Query() pagination: PaginationDto,
    @Query('status') status?: string,
    @Query('search') search?: string,
    @Query('activityId') activityId?: string,
  ) {
    const canViewAll = user.permissions.includes('activities.all');
    return this.service.findAllReport(
      pagination,
      { status, search, activityId },
      user.id,
      canViewAll,
    );
  }

  @Get('member/:memberId')
  @AnyRoles('activities.read', 'members.viewFines')
  findByMember(
    @CurrentUser() user: AuthUser,
    @Param('memberId') memberId: string,
  ) {
    const canViewAll = user.permissions.includes('activities.all');
    return this.service.findByMember(memberId, user.id, canViewAll);
  }

  @Get(':id')
  @Roles('activities.read')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Patch('bulk-pay')
  @Roles('activities.update')
  bulkPay(@Body() dto: BulkPayFinesDto, @CurrentUser('id') userId?: string) {
    return this.service.bulkPay(
      dto.ids,
      dto.notes,
      userId,
      dto.collectorUserId,
    );
  }

  @Patch(':id/pay')
  @Roles('activities.update')
  pay(
    @Param('id') id: string,
    @Body() dto: PayFineDto,
    @CurrentUser('id') userId?: string,
  ) {
    return this.service.pay(id, dto, userId);
  }

  @Patch(':id/cancel')
  @Roles('activities.update')
  cancel(@Param('id') id: string, @Body() dto: CancelFineDto) {
    return this.service.cancel(id, dto);
  }
}
