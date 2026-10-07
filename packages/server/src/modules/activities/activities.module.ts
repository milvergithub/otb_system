import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Member } from '../members/entities/member.entity';
import { User } from '../users/entities/user.entity';
import { ConsumptionModule } from '../consumption/consumption.module';
import { FinancesModule } from '../finances/finances.module';
import { FinanceTransaction } from '../finances/entities/finance-transaction.entity';
import { Activity } from './entities/activity.entity';
import { ActivityType } from './entities/activity-type.entity';
import { ActivityAttendanceSession } from './entities/activity-attendance-session.entity';
import { ActivityEvidence } from './entities/activity-evidence.entity';
import { FineType } from './entities/fine-type.entity';
import { Attendance } from './entities/attendance.entity';
import { Fine } from './entities/fine.entity';
import { ActivitiesService } from './activities.service';
import { ActivityTypesService } from './activity-types.service';
import { ActivityEvidenceService } from './activity-evidence.service';
import { FineTypesService } from './fine-types.service';
import { AttendanceService } from './attendance.service';
import { FinesService } from './fines.service';
import { FinesReceiptService } from './fines-receipt.service';
import { ActivitiesController } from './activities.controller';
import { ActivityTypesController } from './activity-types.controller';
import { ActivityEvidenceController } from './activity-evidence.controller';
import { ActivityFinesController } from './activity-fines.controller';
import { FineTypesController } from './fine-types.controller';
import { AttendanceController } from './attendance.controller';
import { FinesController } from './fines.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Activity,
      ActivityType,
      ActivityAttendanceSession,
      ActivityEvidence,
      FineType,
      Attendance,
      Fine,
      FinanceTransaction,
      Member,
      User,
    ]),
    ConsumptionModule,
    FinancesModule,
  ],
  controllers: [
    ActivitiesController,
    ActivityTypesController,
    ActivityEvidenceController,
    ActivityFinesController,
    FineTypesController,
    AttendanceController,
    FinesController,
  ],
  providers: [
    ActivitiesService,
    ActivityTypesService,
    ActivityEvidenceService,
    FineTypesService,
    AttendanceService,
    FinesService,
    FinesReceiptService,
  ],
  exports: [
    ActivitiesService,
    ActivityTypesService,
    FinesService,
    FinesReceiptService,
  ],
})
export class ActivitiesModule {}
