import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Zone } from './zone.entity';
import { ZoneTypeEntity } from './entities/zone-type.entity';
import { ZonesService } from './zones.service';
import { ZonesController } from './zones.controller';
import { ZoneTypesService } from './zone-types.service';
import { ZoneTypesController } from './zone-types.controller';

@Module({
  imports: [TypeOrmModule.forFeature([Zone, ZoneTypeEntity])],
  controllers: [ZonesController, ZoneTypesController],
  providers: [ZonesService, ZoneTypesService],
  exports: [ZonesService, ZoneTypesService],
})
export class ZonesModule {}
