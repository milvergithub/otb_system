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
import { MeterTypesService } from './meter-types.service';
import { CreateMeterTypeDto, UpdateMeterTypeDto } from './dto/meter-type.dto';

@Controller('meter-types')
export class MeterTypesController {
  constructor(private readonly meterTypesService: MeterTypesService) {}

  @Get()
  @Roles('meter_types.read')
  findAll() {
    return this.meterTypesService.findAll();
  }

  @Get(':id')
  @Roles('meter_types.read')
  findOne(@Param('id') id: string) {
    return this.meterTypesService.findOne(id);
  }

  @Post()
  @Roles('meter_types.create')
  create(@Body() dto: CreateMeterTypeDto) {
    return this.meterTypesService.create(dto);
  }

  @Patch(':id')
  @Roles('meter_types.update')
  update(@Param('id') id: string, @Body() dto: UpdateMeterTypeDto) {
    return this.meterTypesService.update(id, dto);
  }

  @Delete(':id')
  @Roles('meter_types.delete')
  remove(@Param('id') id: string) {
    return this.meterTypesService.remove(id);
  }
}
