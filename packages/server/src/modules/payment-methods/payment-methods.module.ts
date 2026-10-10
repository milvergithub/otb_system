import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PaymentHistory } from '../billing/entities/payment-history.entity';
import { ContributionPayment } from '../contributions/entities/contribution-payment.entity';
import { FinanceTransaction } from '../finances/entities/finance-transaction.entity';
import { SharePayment } from '../shares/entities/share-payment.entity';
import { PaymentMethodEntity } from './entities/payment-method.entity';
import { PaymentMethodsController } from './payment-methods.controller';
import { PaymentMethodsService } from './payment-methods.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      PaymentMethodEntity,
      PaymentHistory,
      SharePayment,
      FinanceTransaction,
      ContributionPayment,
    ]),
  ],
  controllers: [PaymentMethodsController],
  providers: [PaymentMethodsService],
  exports: [PaymentMethodsService],
})
export class PaymentMethodsModule {}
