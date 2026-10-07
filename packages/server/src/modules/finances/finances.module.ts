import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConsumptionModule } from '../consumption/consumption.module';
import { SettingsModule } from '../settings/settings.module';
import { Asset } from '../assets/entities/asset.entity';
import { AssetCategory } from '../assets/entities/asset-category.entity';
import { AssetLocation } from '../assets/entities/asset-location.entity';
import { Consumption } from '../consumption/entities/consumption.entity';
import { Payment } from '../billing/entities/payment.entity';
import { Meter } from '../meters/entities/meter.entity';
import { Member } from '../members/entities/member.entity';
import { User } from '../users/entities/user.entity';
import { Activity } from '../activities/entities/activity.entity';
import { FinanceCategoriesController } from './finance-categories.controller';
import { FinanceCategoriesService } from './finance-categories.service';
import { FinancesController } from './finances.controller';
import { FinancesService } from './finances.service';
import { FinancialResponsibilityService } from './financial-responsibility.service';
import { FinanceCategory } from './entities/finance-category.entity';
import { FinanceDocument } from './entities/finance-document.entity';
import { FinanceTransaction } from './entities/finance-transaction.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      FinanceTransaction,
      FinanceCategory,
      FinanceDocument,
      Member,
      User,
      Asset,
      AssetCategory,
      AssetLocation,
      Payment,
      Consumption,
      Meter,
      Activity,
    ]),
    ConsumptionModule,
    SettingsModule,
  ],
  controllers: [FinancesController, FinanceCategoriesController],
  providers: [
    FinancesService,
    FinanceCategoriesService,
    FinancialResponsibilityService,
  ],
  exports: [
    FinancesService,
    FinanceCategoriesService,
    FinancialResponsibilityService,
  ],
})
export class FinancesModule {}
