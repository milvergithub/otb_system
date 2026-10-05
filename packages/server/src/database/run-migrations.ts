import 'reflect-metadata';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import { DataSource } from 'typeorm';
import { AppDataSource } from './migration-data-source';

const envFile = process.env.ENV_FILE || '.env';
if (fs.existsSync(envFile)) {
  dotenv.config({ path: envFile });
  console.log(`Loaded env from ${envFile}`);
} else {
  console.log('No .env file — using process environment (normal in Docker)');
}
// All migrations in order — used for baseline marking on fresh databases.
const MIGRATIONS = [
  { timestamp: 1755000000000, name: 'CreateAuditLogsTable1755000000000' },
  { timestamp: 1755000000001, name: 'CreateZoneTypesTable1755000000001' },
  { timestamp: 1755000000002, name: 'AddZoneTypeIdAndLineWidth1755000000002' },
  {
    timestamp: 1755000000003,
    name: 'CreateMeterTypesAndAlterMeters1755000000003',
  },
  { timestamp: 1755000000004, name: 'AddTypeIdToBaseTariffs1755000000004' },
  { timestamp: 1755000000005, name: 'AttendanceControls1755000000005' },
  { timestamp: 1755000000006, name: 'FineAttendanceRelations1755000000006' },
  {
    timestamp: 1755000000007,
    name: 'RenameSecretariasToAtividades1755000000007',
  },
  {
    timestamp: 1755000000008,
    name: 'RenameAtividadesToActivities1755000000008',
  },
  { timestamp: 1755000000009, name: 'AddInvoiceCodeToPayments1755000000009' },
  { timestamp: 1755000000010, name: 'RenameImageUrlToImageKey1755000000010' },
  {
    timestamp: 1755000000011,
    name: 'AddEvidenceKeyToPaymentHistory1755000000011',
  },
  {
    timestamp: 1755000000012,
    name: 'AddEvidenceKeyToSharePayments1755000000012',
  },
  {
    timestamp: 1755000000013,
    name: 'CreateAssetsTables1755000000013',
  },
  {
    timestamp: 1755000000014,
    name: 'CreateFinanceTables1755000000014',
  },
  {
    timestamp: 1755000000015,
    name: 'AddMaintenanceExpenseTransaction1755000000015',
  },
];

async function isFreshDatabase(ds: DataSource): Promise<boolean> {
  const result = await ds.query(
    `SELECT EXISTS (
       SELECT 1 FROM pg_tables
       WHERE schemaname = 'public' AND tablename = 'users'
     ) AS exists`,
  );
  return !result[0]?.exists;
}

async function runBaseline(ds: DataSource): Promise<void> {
  console.log('Fresh database detected — running baseline sync...');

  // 1. Ensure uuid-ossp extension (used by migrations 0000000/0000001)
  await ds.query('CREATE EXTENSION IF NOT EXISTS "uuid-ossp"');
  console.log('  Extension uuid-ossp ensured.');

  // 2. Create all tables from entities
  await ds.synchronize();
  console.log('  Schema synchronized from entities.');

  // 3. Create the migrations table (TypeORM internal, not an entity)
  await ds.query(`CREATE TABLE IF NOT EXISTS "migrations" (
    "id" SERIAL NOT NULL,
    "timestamp" bigint NOT NULL,
    "name" character varying NOT NULL,
    CONSTRAINT "PK_d56de4039e0386349d14e8d3713" PRIMARY KEY ("id")
  )`);
  console.log('  Migrations table ensured.');

  // 4. Mark all migrations as executed so TypeORM considers them done
  for (const m of MIGRATIONS) {
    await ds.query(
      `INSERT INTO "migrations" ("timestamp", "name")
       VALUES ($1, $2)
       ON CONFLICT DO NOTHING`,
      [m.timestamp, m.name],
    );
  }
  console.log(
    `  Marked ${MIGRATIONS.length} migrations as executed (baseline).`,
  );
}

async function run() {
  try {
    await AppDataSource.initialize();
    console.log('Database connected.');

    const fresh = await isFreshDatabase(AppDataSource);
    if (fresh) {
      await runBaseline(AppDataSource);
    } else {
      console.log('Running pending migrations...');
      const executed = await AppDataSource.runMigrations({
        transaction: 'each',
      });
      if (executed.length === 0) {
        console.log('No pending migrations.');
      } else {
        console.log(`Executed ${executed.length} migration(s):`);
        executed.forEach((m) => console.log(`  - ${m.name}`));
      }
    }

    await AppDataSource.destroy();
    console.log('Done.');
  } catch (err: any) {
    if (err?.code === '23505') {
      console.warn(
        'Migration skipped (already applied):',
        err?.detail || err?.message,
      );
      await AppDataSource.destroy().catch(() => {});
      console.log('Done (with warnings).');
    } else {
      console.error('Migration failed:', err);
      process.exit(1);
    }
  }
}

run();
