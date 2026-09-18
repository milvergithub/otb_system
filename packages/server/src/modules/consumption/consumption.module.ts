import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Meter } from '../meters/entities/meter.entity';
import { ConsumptionController } from './consumption.controller';
import { ConsumptionService } from './consumption.service';
import { Consumption } from './entities/consumption.entity';
import { StorageService, StorageServiceToken } from './storage.service';

@Module({
  imports: [TypeOrmModule.forFeature([Consumption, Meter])],
  controllers: [ConsumptionController],
  providers: [ConsumptionService, StorageService],
  exports: [ConsumptionService, StorageService],
})
export class ConsumptionModule {}
