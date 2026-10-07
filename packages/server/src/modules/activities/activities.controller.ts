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
import {
  CreateActivityDto,
  FilterActivitiesDto,
  UpdateActivityDto,
  UpdateActivityStatusDto,
} from './dto/activity.dto';
import { ActivitiesService } from './activities.service';

@Controller('activities')
export class ActivitiesController {
  constructor(private readonly service: ActivitiesService) {}

  @Get()
  @Roles('activities.read')
  findAll(
    @Query() pagination: PaginationDto,
    @CurrentUser() user: AuthUser,
    @Query('search') search: string | undefined,
    @Query() filters: FilterActivitiesDto,
  ) {
    return this.service.findAll(
      pagination,
      user.id,
      user.permissions.includes('activities.all'),
      search,
      filters,
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

  @Get(':id/summary')
  @Roles('activities.read')
  getSummary(@Param('id') id: string) {
    return this.service.getSummary(id);
  }

  @Get(':id/attendance/sessions')
  @Roles('activities.read')
  getSessions(@Param('id') id: string) {
    return this.service.getSessions(id);
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

  @Patch(':id/status')
  @Roles('activities.update')
  changeStatus(
    @Param('id') id: string,
    @Body() dto: UpdateActivityStatusDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.service.changeStatus(
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
}
