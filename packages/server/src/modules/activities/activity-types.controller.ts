import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from '@nestjs/common';
import { Roles } from '../../common/decorators/roles.decorator';
import { ActivityTypesService } from './activity-types.service';
import {
  CreateActivityTypeDto,
  UpdateActivityTypeDto,
} from './dto/activity-type.dto';

@Controller('activity-types')
export class ActivityTypesController {
  constructor(private readonly service: ActivityTypesService) {}

  @Get()
  @Roles('activities.read')
  findAll() {
    return this.service.findAll();
  }

  @Post()
  @Roles('activities.update')
  create(@Body() dto: CreateActivityTypeDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  @Roles('activities.update')
  update(@Param('id') id: string, @Body() dto: UpdateActivityTypeDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @Roles('activities.delete')
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }
}
