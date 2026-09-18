import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BaseTariff } from './entities/base-tariff.entity';
import { Tariff } from './entities/tariff.entity';
import { BaseTariffController } from './base-tariff.controller';
import { BaseTariffService } from './base-tariff.service';
import { TariffsController } from './tariffs.controller';
import { TariffsService } from './tariffs.service';

@Module({
  imports: [TypeOrmModule.forFeature([Tariff, BaseTariff])],
  controllers: [TariffsController, BaseTariffController],
  providers: [TariffsService, BaseTariffService],
  exports: [TariffsService, BaseTariffService],
})
export class TariffsModule {}
