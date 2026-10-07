import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { User } from '../modules/users/entities/user.entity';
import { Member } from '../modules/members/entities/member.entity';
import { Meter } from '../modules/meters/entities/meter.entity';
import { MeterTypeEntity } from '../modules/meters/entities/meter-type.entity';
import { Tariff } from '../modules/tariffs/entities/tariff.entity';
import { BaseTariff } from '../modules/tariffs/entities/base-tariff.entity';
import { Setting } from '../modules/settings/entities/setting.entity';
import { Consumption } from '../modules/consumption/entities/consumption.entity';
import { Payment } from '../modules/billing/entities/payment.entity';
import { PaymentHistory } from '../modules/billing/entities/payment-history.entity';
import { PaymentDiscount } from '../modules/billing/entities/payment-discount.entity';
import { Discount } from '../modules/billing/entities/discount.entity';
import { Notification } from '../modules/notifications/entities/notification.entity';
import { Role } from '../modules/roles/entities/role.entity';
import { Permission } from '../modules/roles/entities/permission.entity';
import { SharePayment } from '../modules/shares/entities/share-payment.entity';
import { WaterShare } from '../modules/shares/entities/water-share.entity';
import { AuditLog } from '../modules/audit/entities/audit-log.entity';
import { Zone } from '../modules/zones/zone.entity';
import { ZoneTypeEntity } from '../modules/zones/entities/zone-type.entity';
import { Activity } from '../modules/activities/entities/activity.entity';
import { ActivityType } from '../modules/activities/entities/activity-type.entity';
import { ActivityAttendanceSession } from '../modules/activities/entities/activity-attendance-session.entity';
import { ActivityEvidence } from '../modules/activities/entities/activity-evidence.entity';
import { FineType } from '../modules/activities/entities/fine-type.entity';
import { Attendance } from '../modules/activities/entities/attendance.entity';
import { Fine } from '../modules/activities/entities/fine.entity';
import { Asset } from '../modules/assets/entities/asset.entity';
import { AssetCategory } from '../modules/assets/entities/asset-category.entity';
import { AssetLocation } from '../modules/assets/entities/asset-location.entity';
import { AssetMovement } from '../modules/assets/entities/asset-movement.entity';
import { AssetMaintenance } from '../modules/assets/entities/asset-maintenance.entity';
import { AssetDocument } from '../modules/assets/entities/asset-document.entity';
import { FinanceTransaction } from '../modules/finances/entities/finance-transaction.entity';
import { FinanceCategory } from '../modules/finances/entities/finance-category.entity';
import { FinanceDocument } from '../modules/finances/entities/finance-document.entity';

const isCompiled = __dirname.includes('dist');
const migrationsPath = isCompiled
  ? [__dirname + '/migrations/*{.js,.ts}']
  : ['src/database/migrations/*.ts'];

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5433', 10),
  username: process.env.DB_USERNAME || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'otb_system',
  entities: [
    User,
    Member,
    Meter,
    MeterTypeEntity,
    Tariff,
    BaseTariff,
    Setting,
    Consumption,
    Payment,
    PaymentHistory,
    PaymentDiscount,
    Discount,
    Notification,
    Role,
    Permission,
    SharePayment,
    WaterShare,
    AuditLog,
    Zone,
    ZoneTypeEntity,
    Activity,
    ActivityType,
    ActivityAttendanceSession,
    ActivityEvidence,
    FineType,
    Attendance,
    Fine,
    Asset,
    AssetCategory,
    AssetLocation,
    AssetMovement,
    AssetMaintenance,
    AssetDocument,
    FinanceTransaction,
    FinanceCategory,
    FinanceDocument,
  ],
  migrations: migrationsPath,
  synchronize: false,
});
