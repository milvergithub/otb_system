import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { Roles } from '../../common/decorators/roles.decorator';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { AuthUser } from '../auth/interfaces/auth-user.interface';
import { CreateActivityDto, UpdateActivityDto } from './dto/activity.dto';
import { ActivitiesService } from './activities.service';

@Controller('activities')
export class ActivitiesController {
  constructor(private readonly service: ActivitiesService) {}

  @Get()
  @Roles('activities.read')
  findAll(
    @Query() pagination: PaginationDto,
    @CurrentUser() user: AuthUser,
    @Query('search') search?: string,
  ) {
    return this.service.findAll(
      pagination,
      user.id,
      user.permissions.includes('activities.all'),
      search,
    );
  }

  @Get('all')
  @Roles('activities.read')
  findAllSimple(@CurrentUser() user: AuthUser) {
    return this.service.findAllSimple(
      user.id,
      user.permissions.includes('activities.all'),
    );
  }

  @Get(':id')
  @Roles('activities.read')
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post()
  @Roles('activities.create')
  create(@Body() dto: CreateActivityDto, @CurrentUser() user: AuthUser) {
    return this.service.create(dto, user.id);
  }

  @Patch(':id')
  @Roles('activities.update')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateActivityDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.update(
      id,
      dto,
      user.id,
      user.permissions.includes('activities.all'),
    );
  }

  @Delete(':id')
  @Roles('activities.delete')
  remove(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.service.remove(
      id,
      user.id,
      user.permissions.includes('activities.all'),
    );
  }

  @Post(':id/share')
  @Roles('activities.update')
  share(
    @Param('id') id: string,
    @Body() body: { userId: string; permission?: string },
  ) {
    return this.service.share(id, body.userId, body.permission ?? 'viewer');
  }

  @Delete(':id/share/:userId')
  @Roles('activities.update')
  unshare(@Param('id') id: string, @Param('userId') userId: string) {
    return this.service.unshare(id, userId);
  }

  @Get(':id/shares')
  @Roles('activities.read')
  getShares(@Param('id') id: string) {
    return this.service.getShares(id);
  }
}
