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
import { BaseTariffService } from './base-tariff.service';
import {
  CreateBaseTariffDto,
  UpdateBaseTariffDto,
} from './dto/base-tariff.dto';

@Controller('base-tariffs')
export class BaseTariffController {
  constructor(private readonly baseTariffService: BaseTariffService) {}

  @Get()
  findAll() {
    return this.baseTariffService.findAll();
  }

  @Get('active')
  findActive() {
    return this.baseTariffService.findActive();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.baseTariffService.findOne(id);
  }

  @Post()
  @Roles('tariffs.create')
  create(@Body() dto: CreateBaseTariffDto) {
    return this.baseTariffService.create(dto);
  }

  @Patch(':id')
  @Roles('tariffs.update')
  update(@Param('id') id: string, @Body() dto: UpdateBaseTariffDto) {
    return this.baseTariffService.update(id, dto);
  }

  @Delete(':id')
  @Roles('tariffs.delete')
  deactivate(@Param('id') id: string) {
    return this.baseTariffService.deactivate(id);
  }
}
