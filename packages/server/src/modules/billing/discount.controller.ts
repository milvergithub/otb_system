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
import { CreateDiscountDto, UpdateDiscountDto } from './dto/discount.dto';
import { DiscountService } from './discount.service';

@Controller('billing/discounts')
export class DiscountController {
  constructor(private readonly discountService: DiscountService) {}

  @Get()
  @Roles('discounts.read')
  findAll() {
    return this.discountService.findAll();
  }

  @Get('active')
  @Roles('discounts.read')
  findActive() {
    return this.discountService.findActive();
  }

  @Get(':id')
  @Roles('discounts.read')
  findOne(@Param('id') id: string) {
    return this.discountService.findOne(id);
  }

  @Post()
  @Roles('discounts.create')
  create(@Body() dto: CreateDiscountDto) {
    return this.discountService.create(dto);
  }

  @Patch(':id')
  @Roles('discounts.update')
  update(@Param('id') id: string, @Body() dto: UpdateDiscountDto) {
    return this.discountService.update(id, dto);
  }

  @Delete(':id')
  @Roles('discounts.delete')
  remove(@Param('id') id: string) {
    return this.discountService.remove(id);
  }
}
