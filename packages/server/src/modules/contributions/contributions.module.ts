import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConsumptionModule } from '../consumption/consumption.module';
import { FinancesModule } from '../finances/finances.module';
import { PaymentMethodsModule } from '../payment-methods/payment-methods.module';
import { Member } from '../members/entities/member.entity';
import { User } from '../users/entities/user.entity';
import { FinanceDocument } from '../finances/entities/finance-document.entity';
import { Contribution } from './entities/contribution.entity';
import { ContributionObligation } from './entities/contribution-obligation.entity';
import { ContributionPayment } from './entities/contribution-payment.entity';
import { ContributionsController } from './contributions.controller';
import { ContributionsReceiptService } from './contributions-receipt.service';
import { ContributionsService } from './contributions.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Contribution,
      ContributionObligation,
      ContributionPayment,
      FinanceDocument,
      Member,
      User,
    ]),
    ConsumptionModule,
    FinancesModule,
    PaymentMethodsModule,
  ],
  controllers: [ContributionsController],
  providers: [ContributionsService, ContributionsReceiptService],
  exports: [ContributionsService, ContributionsReceiptService],
})
export class ContributionsModule {}
