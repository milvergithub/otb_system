import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Payment } from '../billing/entities/payment.entity';
import { Consumption } from '../consumption/entities/consumption.entity';
import { Member } from '../members/entities/member.entity';
import { Meter } from '../meters/entities/meter.entity';
import { SharePayment } from '../shares/entities/share-payment.entity';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Payment,
      Consumption,
      Member,
      Meter,
      SharePayment,
    ]),
  ],
  controllers: [ReportsController],
  providers: [ReportsService],
})
export class ReportsModule {}
