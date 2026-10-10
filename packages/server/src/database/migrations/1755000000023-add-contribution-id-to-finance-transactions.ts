import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Links a finance movement to a contribution campaign.
 *
 * `finance_transactions.contribution_id` mirrors `activity_id`: it ties the
 * movement to the campaign that originated it (fine payments, expenses paid
 * with the collected money), so `/finances?contributionId=` and the campaign
 * summary can aggregate the ledger without scanning `source_id`.
 *
 * Additive and idempotent; historical movements are never rewritten.
 */
export class AddContributionIdToFinanceTransactions1755000000023 implements MigrationInterface {
  name = 'AddContributionIdToFinanceTransactions1755000000023';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "finance_transactions" ADD COLUMN IF NOT EXISTS "contribution_id" uuid`,
    );

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint
          WHERE conrelid = 'finance_transactions'::regclass
            AND contype = 'f'
            AND conname = 'FK_finance_transactions_contribution'
        ) THEN
          ALTER TABLE "finance_transactions"
            ADD CONSTRAINT "FK_finance_transactions_contribution"
            FOREIGN KEY ("contribution_id") REFERENCES "contributions"("id")
            ON DELETE SET NULL;
        END IF;
      END $$;
    `);

    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_finance_transactions_contribution_id" ON "finance_transactions" ("contribution_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_finance_transactions_contribution_id"`,
    );
    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM pg_constraint
          WHERE conname = 'FK_finance_transactions_contribution'
        ) THEN
          ALTER TABLE "finance_transactions"
            DROP CONSTRAINT "FK_finance_transactions_contribution";
        END IF;
      END $$;
    `);
    await queryRunner.query(
      `ALTER TABLE "finance_transactions" DROP COLUMN IF EXISTS "contribution_id"`,
    );
  }
}
