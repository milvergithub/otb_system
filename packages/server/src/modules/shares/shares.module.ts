import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConsumptionModule } from '../consumption/consumption.module';
import { FinancesModule } from '../finances/finances.module';
import { Meter } from '../meters/entities/meter.entity';
import { SharePayment } from './entities/share-payment.entity';
import { WaterShare } from './entities/water-share.entity';
import { SharePaymentsController } from './share-payments.controller';
import { SharePaymentsService } from './share-payments.service';
import { ShareReceiptService } from './share-receipt.service';
import { SharesController } from './shares.controller';
import { SharesService } from './shares.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([WaterShare, SharePayment, Meter]),
    ConsumptionModule,
    FinancesModule,
  ],
  controllers: [SharesController, SharePaymentsController],
  providers: [SharesService, SharePaymentsService, ShareReceiptService],
  exports: [SharesService, SharePaymentsService, ShareReceiptService],
})
export class SharesModule {}
