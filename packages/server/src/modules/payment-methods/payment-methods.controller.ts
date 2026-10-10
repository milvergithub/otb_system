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
import {
  CreatePaymentMethodDto,
  UpdatePaymentMethodDto,
} from './dto/payment-method.dto';
import { PaymentMethodsService } from './payment-methods.service';

@Controller('payment-methods')
export class PaymentMethodsController {
  constructor(private readonly paymentMethodsService: PaymentMethodsService) {}

  @Get()
  @Roles('payment_methods.read')
  findAll() {
    return this.paymentMethodsService.findAll();
  }

  @Get(':id')
  @Roles('payment_methods.read')
  findOne(@Param('id') id: string) {
    return this.paymentMethodsService.findOne(id);
  }

  @Post()
  @Roles('payment_methods.create')
  create(@Body() dto: CreatePaymentMethodDto) {
    return this.paymentMethodsService.create(dto);
  }

  @Patch(':id')
  @Roles('payment_methods.update')
  update(@Param('id') id: string, @Body() dto: UpdatePaymentMethodDto) {
    return this.paymentMethodsService.update(id, dto);
  }

  @Delete(':id')
  @Roles('payment_methods.delete')
  remove(@Param('id') id: string) {
    return this.paymentMethodsService.remove(id);
  }
}
