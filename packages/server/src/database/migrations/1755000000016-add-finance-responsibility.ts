import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Option B: financial responsibility distributed on existing entities.
 *
 * Adds the three responsibility concepts to finance_transactions:
 * - responsible_user_id    (who is financially responsible, snapshot)
 * - collector_user_id      (who physically collected the money, snapshot)
 * - registered_by_user_id  (who registered the operation, always server-set)
 *
 * And the explicit financial responsible on activities (kept independent from
 * created_by).
 *
 * All columns are nullable: historical rows stay NULL rather than being
 * attributed to an arbitrary user. The only backfill performed is the safe
 * one: legacy `user_id` on manual movements already meant "registered by".
 *
 * Every statement is defensive so the migration is safe on both a fresh
 * database built from entities (synchronize) and an existing one.
 */
export class AddFinanceResponsibility1755000000016 implements MigrationInterface {
  name = 'AddFinanceResponsibility1755000000016';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "finance_transactions" ADD COLUMN IF NOT EXISTS "responsible_user_id" uuid`,
    );
    await queryRunner.query(
      `ALTER TABLE "finance_transactions" ADD COLUMN IF NOT EXISTS "collector_user_id" uuid`,
    );
    await queryRunner.query(
      `ALTER TABLE "finance_transactions" ADD COLUMN IF NOT EXISTS "registered_by_user_id" uuid`,
    );

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint
          WHERE conname = 'FK_finance_transactions_responsible_user'
        ) THEN
          ALTER TABLE "finance_transactions"
            ADD CONSTRAINT "FK_finance_transactions_responsible_user"
            FOREIGN KEY ("responsible_user_id")
            REFERENCES "users"("id")
            ON DELETE SET NULL;
        END IF;
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint
          WHERE conname = 'FK_finance_transactions_collector_user'
        ) THEN
          ALTER TABLE "finance_transactions"
            ADD CONSTRAINT "FK_finance_transactions_collector_user"
            FOREIGN KEY ("collector_user_id")
            REFERENCES "users"("id")
            ON DELETE SET NULL;
        END IF;
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint
          WHERE conname = 'FK_finance_transactions_registered_by_user'
        ) THEN
          ALTER TABLE "finance_transactions"
            ADD CONSTRAINT "FK_finance_transactions_registered_by_user"
            FOREIGN KEY ("registered_by_user_id")
            REFERENCES "users"("id")
            ON DELETE SET NULL;
        END IF;
      END $$;
    `);

    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_finance_transactions_responsible_user_id" ON "finance_transactions" ("responsible_user_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_finance_transactions_collector_user_id" ON "finance_transactions" ("collector_user_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_finance_transactions_registered_by_user_id" ON "finance_transactions" ("registered_by_user_id")`,
    );

    // Safe backfill: legacy user_id on manual movements was the authenticated
    // registrant. Machine movements have user_id NULL and stay NULL.
    await queryRunner.query(`
      UPDATE "finance_transactions"
      SET "registered_by_user_id" = "user_id"
      WHERE "user_id" IS NOT NULL AND "registered_by_user_id" IS NULL
    `);

    await queryRunner.query(
      `ALTER TABLE "activities" ADD COLUMN IF NOT EXISTS "financial_responsible_user_id" uuid`,
    );
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint
          WHERE conname = 'FK_activities_financial_responsible_user'
        ) THEN
          ALTER TABLE "activities"
            ADD CONSTRAINT "FK_activities_financial_responsible_user"
            FOREIGN KEY ("financial_responsible_user_id")
            REFERENCES "users"("id")
            ON DELETE SET NULL;
        END IF;
      END $$;
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_activities_financial_responsible_user_id" ON "activities" ("financial_responsible_user_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_activities_financial_responsible_user_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "activities" DROP CONSTRAINT IF EXISTS "FK_activities_financial_responsible_user"`,
    );
    await queryRunner.query(
      `ALTER TABLE "activities" DROP COLUMN IF EXISTS "financial_responsible_user_id"`,
    );

    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_finance_transactions_registered_by_user_id"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_finance_transactions_collector_user_id"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_finance_transactions_responsible_user_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "finance_transactions" DROP CONSTRAINT IF EXISTS "FK_finance_transactions_registered_by_user"`,
    );
    await queryRunner.query(
      `ALTER TABLE "finance_transactions" DROP CONSTRAINT IF EXISTS "FK_finance_transactions_collector_user"`,
    );
    await queryRunner.query(
      `ALTER TABLE "finance_transactions" DROP CONSTRAINT IF EXISTS "FK_finance_transactions_responsible_user"`,
    );
    await queryRunner.query(
      `ALTER TABLE "finance_transactions" DROP COLUMN IF EXISTS "registered_by_user_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "finance_transactions" DROP COLUMN IF EXISTS "collector_user_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "finance_transactions" DROP COLUMN IF EXISTS "responsible_user_id"`,
    );
  }
}
