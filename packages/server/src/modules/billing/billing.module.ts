import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Consumption } from '../consumption/entities/consumption.entity';
import { ConsumptionModule } from '../consumption/consumption.module';
import { FinancesModule } from '../finances/finances.module';
import { SettingsModule } from '../settings/settings.module';
import { TariffsModule } from '../tariffs/tariffs.module';
import { PaymentMethodsModule } from '../payment-methods/payment-methods.module';
import { BillingController } from './billing.controller';
import { BillingService } from './billing.service';
import { DiscountController } from './discount.controller';
import { DiscountService } from './discount.service';
import { Discount } from './entities/discount.entity';
import { PaymentDiscount } from './entities/payment-discount.entity';
import { PaymentHistory } from './entities/payment-history.entity';
import { PaymentSurcharge } from './entities/payment-surcharge.entity';
import { Payment } from './entities/payment.entity';
import { ReceiptService } from './receipt.service';
import { Surcharge } from './entities/surcharge.entity';
import { SurchargeController } from './surcharge.controller';
import { SurchargeService } from './surcharge.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Payment,
      PaymentHistory,
      PaymentDiscount,
      PaymentSurcharge,
      Consumption,
      Discount,
      Surcharge,
    ]),
    TariffsModule,
    SettingsModule,
    ConsumptionModule,
    FinancesModule,
    PaymentMethodsModule,
  ],
  controllers: [SurchargeController, DiscountController, BillingController],
  providers: [
    BillingService,
    ReceiptService,
    DiscountService,
    SurchargeService,
  ],
  exports: [BillingService, DiscountService, ReceiptService, SurchargeService],
})
export class BillingModule {}
