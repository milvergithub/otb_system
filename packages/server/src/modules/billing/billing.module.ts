import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Consumption } from '../consumption/entities/consumption.entity';
import { ConsumptionModule } from '../consumption/consumption.module';
import { FinancesModule } from '../finances/finances.module';
import { SettingsModule } from '../settings/settings.module';
import { TariffsModule } from '../tariffs/tariffs.module';
import { BillingController } from './billing.controller';
import { BillingService } from './billing.service';
import { DiscountController } from './discount.controller';
import { DiscountService } from './discount.service';
import { Discount } from './entities/discount.entity';
import { PaymentDiscount } from './entities/payment-discount.entity';
import { PaymentHistory } from './entities/payment-history.entity';
import { Payment } from './entities/payment.entity';
import { ReceiptService } from './receipt.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Payment,
      PaymentHistory,
      PaymentDiscount,
      Consumption,
      Discount,
    ]),
    TariffsModule,
    SettingsModule,
    ConsumptionModule,
    FinancesModule,
  ],
  controllers: [DiscountController, BillingController],
  providers: [BillingService, ReceiptService, DiscountService],
  exports: [BillingService, DiscountService, ReceiptService],
})
export class BillingModule {}
