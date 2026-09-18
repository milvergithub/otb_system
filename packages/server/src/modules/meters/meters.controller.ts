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
import { CreateMeterDto, UpdateMeterDto } from './dto/meter.dto';
import { MeterStatus } from './entities/meter.entity';
import { MetersService } from './meters.service';

@Controller('meters')
export class MetersController {
  constructor(private readonly metersService: MetersService) {}

  @Get()
  @Roles('meters.read')
  findAll(
    @Query() pagination: PaginationDto,
    @Query('status') status?: MeterStatus,
    @Query('type') type?: string,
    @Query('search') search?: string,
  ) {
    return this.metersService.findAll(pagination, { status, type, search });
  }

  @Get('map')
  @Roles('meters.read')
  findAllForMap() {
    return this.metersService.findAllForMap();
  }

  @Get('member/:memberId')
  @Roles('meters.read')
  findByMember(@Param('memberId') memberId: string) {
    return this.metersService.findByMember(memberId);
  }

  @Get(':id')
  @Roles('meters.read')
  findOne(@Param('id') id: string) {
    return this.metersService.findOne(id);
  }

  @Post()
  @Roles('meters.create')
  create(@Body() dto: CreateMeterDto) {
    return this.metersService.create(dto);
  }

  @Patch(':id')
  @Roles('meters.update')
  update(@Param('id') id: string, @Body() dto: UpdateMeterDto) {
    return this.metersService.update(id, dto);
  }

  @Delete(':id/decommission')
  @Roles('meters.delete')
  decommission(@Param('id') id: string) {
    return this.metersService.decommission(id);
  }

  @Delete(':id')
  @Roles('meters.delete')
  remove(@Param('id') id: string) {
    return this.metersService.remove(id);
  }
}
