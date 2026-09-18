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
import { CreateTariffDto, UpdateTariffDto } from './dto/tariff.dto';
import { TariffsService } from './tariffs.service';

@Controller('tariffs')
export class TariffsController {
  constructor(private readonly tariffsService: TariffsService) {}

  @Get()
  @Roles('tariffs.read')
  findAll(@Query('includeInactive') includeInactive?: string) {
    return this.tariffsService.findAll(includeInactive === 'true');
  }

  @Get(':id')
  @Roles('tariffs.read')
  findOne(@Param('id') id: string) {
    return this.tariffsService.findOne(id);
  }

  @Post()
  @Roles('tariffs.create')
  create(@Body() dto: CreateTariffDto) {
    return this.tariffsService.create(dto);
  }

  @Patch(':id')
  @Roles('tariffs.update')
  update(@Param('id') id: string, @Body() dto: UpdateTariffDto) {
    return this.tariffsService.update(id, dto);
  }

  @Delete(':id')
  @Roles('tariffs.delete')
  deactivate(@Param('id') id: string) {
    return this.tariffsService.deactivate(id);
  }

  @Post('copy')
  @Roles('tariffs.create')
  copy(
    @Body()
    body: {
      sourceValidFrom: string;
      sourceValidUntil?: string;
      newValidFrom: string;
      newValidUntil?: string;
    },
  ) {
    return this.tariffsService.copyTariffs(
      body.sourceValidFrom,
      body.sourceValidUntil,
      body.newValidFrom,
      body.newValidUntil,
    );
  }
}
