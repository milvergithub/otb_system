import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CreateSharePaymentDto } from './dto/share-payment.dto';
import { SharePaymentsService } from './share-payments.service';

@Controller('meters/:meterId/share-payments')
export class SharePaymentsController {
  constructor(private readonly sharePaymentsService: SharePaymentsService) {}

  @Get()
  @Roles('meters.read')
  findByMeter(@Param('meterId') meterId: string) {
    return this.sharePaymentsService.findByMeter(meterId);
  }

  @Get('summary')
  @Roles('meters.read')
  getSummary(@Param('meterId') meterId: string) {
    return this.sharePaymentsService.getSummary(meterId);
  }

  @Post()
  @Roles('meters.sharePayments')
  create(
    @Param('meterId') meterId: string,
    @Body() dto: CreateSharePaymentDto,
    @CurrentUser('id') userId?: string,
  ) {
    return this.sharePaymentsService.create(meterId, dto, userId);
  }
}
