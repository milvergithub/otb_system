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
import { CreateSurchargeDto, UpdateSurchargeDto } from './dto/surcharge.dto';
import { SurchargeService } from './surcharge.service';

@Controller('billing/surcharges')
export class SurchargeController {
  constructor(private readonly surchargeService: SurchargeService) {}

  @Get()
  @Roles('surcharges.read')
  findAll() {
    return this.surchargeService.findAll();
  }

  @Get('active')
  @Roles('surcharges.read')
  findActive() {
    return this.surchargeService.findActive();
  }

  @Get(':id')
  @Roles('surcharges.read')
  findOne(@Param('id') id: string) {
    return this.surchargeService.findOne(id);
  }

  @Post()
  @Roles('surcharges.create')
  create(@Body() dto: CreateSurchargeDto) {
    return this.surchargeService.create(dto);
  }

  @Patch(':id')
  @Roles('surcharges.update')
  update(@Param('id') id: string, @Body() dto: UpdateSurchargeDto) {
    return this.surchargeService.update(id, dto);
  }

  @Delete(':id')
  @Roles('surcharges.delete')
  remove(@Param('id') id: string) {
    return this.surchargeService.remove(id);
  }
}
