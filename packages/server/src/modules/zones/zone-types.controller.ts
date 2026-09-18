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
import { ZoneTypesService } from './zone-types.service';
import { CreateZoneTypeDto, UpdateZoneTypeDto } from './dto/zone-type.dto';

@Controller('zone-types')
export class ZoneTypesController {
  constructor(private readonly zoneTypesService: ZoneTypesService) {}

  @Get()
  @Roles('zone_types.read')
  findAll() {
    return this.zoneTypesService.findAll();
  }

  @Get(':id')
  @Roles('zone_types.read')
  findOne(@Param('id') id: string) {
    return this.zoneTypesService.findOne(id);
  }

  @Post()
  @Roles('zone_types.create')
  create(@Body() dto: CreateZoneTypeDto) {
    return this.zoneTypesService.create(dto);
  }

  @Patch(':id')
  @Roles('zone_types.update')
  update(@Param('id') id: string, @Body() dto: UpdateZoneTypeDto) {
    return this.zoneTypesService.update(id, dto);
  }

  @Delete(':id')
  @Roles('zone_types.delete')
  remove(@Param('id') id: string) {
    return this.zoneTypesService.remove(id);
  }
}
