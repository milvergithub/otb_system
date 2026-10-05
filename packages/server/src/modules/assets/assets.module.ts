import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Member } from '../members/entities/member.entity';
import { User } from '../users/entities/user.entity';
import { ConsumptionModule } from '../consumption/consumption.module';
import { FinancesModule } from '../finances/finances.module';
import { AssetCategoriesController } from './asset-categories.controller';
import { AssetCategoriesService } from './asset-categories.service';
import { AssetLocationsController } from './asset-locations.controller';
import { AssetLocationsService } from './asset-locations.service';
import { AssetsController } from './assets.controller';
import { AssetsService } from './assets.service';
import { AssetCategory } from './entities/asset-category.entity';
import { AssetLocation } from './entities/asset-location.entity';
import { AssetDocument } from './entities/asset-document.entity';
import { AssetMaintenance } from './entities/asset-maintenance.entity';
import { AssetMovement } from './entities/asset-movement.entity';
import { Asset } from './entities/asset.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Asset,
      AssetCategory,
      AssetLocation,
      AssetMovement,
      AssetMaintenance,
      AssetDocument,
      User,
      Member,
    ]),
    ConsumptionModule,
    FinancesModule,
  ],
  controllers: [
    AssetsController,
    AssetCategoriesController,
    AssetLocationsController,
  ],
  providers: [AssetsService, AssetCategoriesService, AssetLocationsService],
  exports: [AssetsService, AssetCategoriesService, AssetLocationsService],
})
export class AssetsModule {}
