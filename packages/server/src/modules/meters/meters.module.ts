import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Member } from '../members/entities/member.entity';
import { SharesModule } from '../shares/shares.module';
import { SharePayment } from '../shares/entities/share-payment.entity';
import { TariffsModule } from '../tariffs/tariffs.module';
import { Meter } from './entities/meter.entity';
import { MeterTypeEntity } from './entities/meter-type.entity';
import { MetersController } from './meters.controller';
import { MetersService } from './meters.service';
import { MeterTypesController } from './meter-types.controller';
import { MeterTypesService } from './meter-types.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([Meter, MeterTypeEntity, Member, SharePayment]),
    SharesModule,
    TariffsModule,
  ],
  controllers: [MetersController, MeterTypesController],
  providers: [MetersService, MeterTypesService],
  exports: [MetersService, MeterTypesService],
})
export class MetersModule {}
