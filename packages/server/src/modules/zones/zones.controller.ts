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
import { ZonesService } from './zones.service';
import { CreateZoneDto, UpdateZoneDto } from './dto/zone.dto';

@Controller('zones')
export class ZonesController {
  constructor(private readonly zonesService: ZonesService) {}

  @Get()
  @Roles('zones.read')
  findAll() {
    return this.zonesService.findAll();
  }

  @Get(':id')
  @Roles('zones.read')
  findOne(@Param('id') id: string) {
    return this.zonesService.findOne(id);
  }

  @Post()
  @Roles('zones.create')
  create(@Body() dto: CreateZoneDto) {
    return this.zonesService.create(dto);
  }

  @Patch(':id')
  @Roles('zones.update')
  update(@Param('id') id: string, @Body() dto: UpdateZoneDto) {
    return this.zonesService.update(id, dto);
  }

  @Delete(':id')
  @Roles('zones.delete')
  remove(@Param('id') id: string) {
    return this.zonesService.remove(id);
  }
}
