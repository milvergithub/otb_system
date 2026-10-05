import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Member } from '../members/entities/member.entity';
import { FinancesModule } from '../finances/finances.module';
import { Activity } from './entities/activity.entity';
import { ActivityShare } from './entities/activity-share.entity';
import { FineType } from './entities/fine-type.entity';
import { Attendance } from './entities/attendance.entity';
import { Fine } from './entities/fine.entity';
import { ActivitiesService } from './activities.service';
import { FineTypesService } from './fine-types.service';
import { AttendanceService } from './attendance.service';
import { FinesService } from './fines.service';
import { FinesReceiptService } from './fines-receipt.service';
import { ActivitiesController } from './activities.controller';
import { FineTypesController } from './fine-types.controller';
import { AttendanceController } from './attendance.controller';
import { FinesController } from './fines.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Activity,
      ActivityShare,
      FineType,
      Attendance,
      Fine,
      Member,
    ]),
    FinancesModule,
  ],
  controllers: [
    ActivitiesController,
    FineTypesController,
    AttendanceController,
    FinesController,
  ],
  providers: [
    ActivitiesService,
    FineTypesService,
    AttendanceService,
    FinesService,
    FinesReceiptService,
  ],
  exports: [ActivitiesService, FinesService, FinesReceiptService],
})
export class ActivitiesModule {}
