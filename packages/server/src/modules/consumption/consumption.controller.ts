import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { Roles } from '../../common/decorators/roles.decorator';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { ConsumptionService } from './consumption.service';
import { CreateConsumptionDto } from './dto/consumption.dto';

@Controller('consumption')
export class ConsumptionController {
  constructor(private readonly consumptionService: ConsumptionService) {}

  @Get()
  @Roles('consumption.read')
  findAll(
    @Query() pagination: PaginationDto,
    @Query('month') month?: string,
    @Query('year') year?: string,
    @Query('meterId') meterId?: string,
    @Query('search') search?: string,
  ) {
    return this.consumptionService.findAll(pagination, {
      month: month ? parseInt(month, 10) : undefined,
      year: year ? parseInt(year, 10) : undefined,
      meterId,
      search: search || undefined,
    });
  }

  @Get('meter/:meterId')
  @Roles('consumption.read')
  findHistoryByMeter(@Param('meterId') meterId: string) {
    return this.consumptionService.findHistoryByMeter(meterId);
  }

  @Get(':id')
  @Roles('consumption.read')
  findOne(@Param('id') id: string) {
    return this.consumptionService.findOne(id);
  }

  @Post()
  @Roles('consumption.create')
  create(@Body() dto: CreateConsumptionDto) {
    return this.consumptionService.create(dto);
  }

  @Delete(':id')
  @Roles('consumption.delete')
  remove(@Param('id') id: string) {
    return this.consumptionService.remove(id);
  }
}
