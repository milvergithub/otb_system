import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Activity fine collector.
 *
 * - activities.collector_user_id: the user selected when creating the activity
 *   to collect its fine payments. Fine movements snapshot it into
 *   finance_transactions.responsible_user_id (rendición de cuentas).
 * - Drops the removed `activity_fine_responsible_user_id` setting key.
 *
 * Additive and idempotent; historical finance movements are never rewritten.
 */
export class AddActivityCollector1755000000018 implements MigrationInterface {
  name = 'AddActivityCollector1755000000018';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "activities" ADD COLUMN IF NOT EXISTS "collector_user_id" uuid`,
    );

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint
          WHERE conrelid = 'activities'::regclass
            AND contype = 'f'
            AND conkey = ARRAY[
              (SELECT attnum FROM pg_attribute
               WHERE attrelid = 'activities'::regclass
                 AND attname = 'collector_user_id')
            ]::smallint[]
        ) THEN
          ALTER TABLE "activities"
            ADD CONSTRAINT "FK_activities_collector_user"
            FOREIGN KEY ("collector_user_id") REFERENCES "users"("id")
            ON DELETE SET NULL;
        END IF;
      END $$;
    `);

    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_activities_collector_user_id" ON "activities" ("collector_user_id")`,
    );

    await queryRunner.query(
      `DELETE FROM "settings" WHERE "key" = 'activity_fine_responsible_user_id'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_activities_collector_user_id"`,
    );
    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM pg_constraint
          WHERE conname = 'FK_activities_collector_user'
        ) THEN
          ALTER TABLE "activities" DROP CONSTRAINT "FK_activities_collector_user";
        END IF;
      END $$;
    `);
    await queryRunner.query(
      `ALTER TABLE "activities" DROP COLUMN IF EXISTS "collector_user_id"`,
    );
  }
}
