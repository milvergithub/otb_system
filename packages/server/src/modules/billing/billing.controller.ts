import { Body, Controller, Get, Param, Post, Query, Res } from '@nestjs/common';
import { Response } from 'express';
import { Roles } from '../../common/decorators/roles.decorator';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { BillingService } from './billing.service';
import {
  BillingQueryDto,
  GenerateBillDto,
  PayBillDto,
} from './dto/billing.dto';
import { PaymentStatus } from './entities/payment.entity';
import { ReceiptService } from './receipt.service';

@Controller('billing')
export class BillingController {
  constructor(
    private readonly billingService: BillingService,
    private readonly receiptService: ReceiptService,
  ) {}

  @Get()
  @Roles('billing.read')
  findAll(
    @Query() pagination: PaginationDto,
    @Query('month') month?: string,
    @Query('year') year?: string,
    @Query('status') status?: PaymentStatus,
    @Query('search') search?: string,
  ) {
    return this.billingService.findAll(pagination, {
      month: month ? parseInt(month, 10) : undefined,
      year: year ? parseInt(year, 10) : undefined,
      status,
      search,
    });
  }

  @Get(':id')
  @Roles('billing.read')
  findOne(@Param('id') id: string) {
    return this.billingService.findOne(id);
  }

  @Get(':id/receipt')
  @Roles('billing.download')
  async receipt(@Param('id') id: string, @Res() res: Response) {
    const buffer = await this.receiptService.generateReceipt(id);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="receipt-${id}.pdf"`,
      'Content-Length': buffer.length,
    });
    res.end(buffer);
  }

  @Get(':id/receipt/view')
  @Roles('billing.download')
  async receiptView(@Param('id') id: string, @Res() res: Response) {
    const buffer = await this.receiptService.generateReceipt(id);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `inline; filename="receipt-${id}.pdf"`,
      'Content-Length': buffer.length,
    });
    res.end(buffer);
  }

  @Post(':consumptionId/generate')
  @Roles('billing.create')
  generate(
    @Param('consumptionId') consumptionId: string,
    @Body() dto: GenerateBillDto,
  ) {
    return this.billingService.generateBill(consumptionId, dto.discountIds);
  }

  @Post(':id/pay')
  @Roles('billing.update')
  pay(@Param('id') id: string, @Body() dto: PayBillDto) {
    return this.billingService.pay(id, dto);
  }
}
