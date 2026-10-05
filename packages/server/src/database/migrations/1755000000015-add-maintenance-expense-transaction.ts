import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Links a closed asset maintenance to the finance movement that expensed it.
 *
 * The column already exists in databases created through `synchronize`, so both
 * the column and the constraint are added defensively: this migration is safe to
 * run on a synchronized database and on a fresh one built from entities.
 */
export class AddMaintenanceExpenseTransaction1755000000015 implements MigrationInterface {
  name = 'AddMaintenanceExpenseTransaction1755000000015';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "asset_maintenances" ADD COLUMN IF NOT EXISTS "expense_transaction_id" uuid`,
    );
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint
          WHERE conname = 'FK_asset_maintenances_expense_transaction'
        ) THEN
          ALTER TABLE "asset_maintenances"
            ADD CONSTRAINT "FK_asset_maintenances_expense_transaction"
            FOREIGN KEY ("expense_transaction_id")
            REFERENCES "finance_transactions"("id")
            ON DELETE SET NULL;
        END IF;
      END $$;
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_asset_maintenances_expense_transaction" ON "asset_maintenances" ("expense_transaction_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_asset_maintenances_expense_transaction"`,
    );
    await queryRunner.query(
      `ALTER TABLE "asset_maintenances" DROP CONSTRAINT IF EXISTS "FK_asset_maintenances_expense_transaction"`,
    );
    await queryRunner.query(
      `ALTER TABLE "asset_maintenances" DROP COLUMN IF EXISTS "expense_transaction_id"`,
    );
  }
}
