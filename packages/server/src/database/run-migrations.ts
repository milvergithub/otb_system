import 'reflect-metadata';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import { AppDataSource } from './migration-data-source';

const envFile = process.env.ENV_FILE || '.env';
if (fs.existsSync(envFile)) {
  dotenv.config({ path: envFile });
  console.log(`Loaded env from ${envFile}`);
} else {
  console.log('No .env file — using process environment (normal in Docker)');
}

async function run() {
  try {
    await AppDataSource.initialize();
    console.log('Database connected. Running migrations...');

    const pending = await AppDataSource.showMigrations();
    if (!pending) {
      console.log('No pending migrations.');
      await AppDataSource.destroy();
      return;
    }

    const executed = await AppDataSource.runMigrations({ transaction: 'all' });
    if (executed.length === 0) {
      console.log('No pending migrations.');
    } else {
      console.log(`Executed ${executed.length} migration(s):`);
      executed.forEach((m) => console.log(`  - ${m.name}`));
    }
    await AppDataSource.destroy();
    console.log('Done.');
  } catch (err: any) {
    // Duplicate key = already applied — warn but don't crash
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
