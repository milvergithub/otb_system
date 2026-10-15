import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSurchargesAndLateFees1755000000029 implements MigrationInterface {
  name = 'AddSurchargesAndLateFees1755000000029';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Preserve relational integrity cleanup is not needed for a fresh additive
    // change; all statements below are idempotent so re-running is safe.
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "surcharges" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "name" character varying NOT NULL,
        "type" character varying(20) NOT NULL DEFAULT 'fixed',
        "value" numeric(10, 2) NOT NULL,
        "description" text,
        "is_active" boolean NOT NULL DEFAULT true,
        "created_at" TIMESTAMP WITH TIME ZONE DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT now()
      )
    `);
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "UQ_surcharges_name"
        ON "surcharges" ("name")
    `);

    await queryRunner.query(`
      ALTER TABLE "payments"
        ADD COLUMN IF NOT EXISTS "late_fee_amount" numeric(10, 2) NOT NULL DEFAULT 0
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "payment_surcharges" (
        "id" uuid PRIMARY KEY DEFAULT uuid_generate_v4(),
        "payment_id" uuid NOT NULL,
        "surcharge_id" uuid NOT NULL,
        "amount" numeric(10, 2) NOT NULL,
        "created_at" TIMESTAMP WITH TIME ZONE DEFAULT now(),
        CONSTRAINT "FK_payment_surcharges_payment"
          FOREIGN KEY ("payment_id") REFERENCES "payments"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_payment_surcharges_surcharge"
          FOREIGN KEY ("surcharge_id") REFERENCES "surcharges"("id")
      )
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_payment_surcharges_payment"
        ON "payment_surcharges" ("payment_id")
    `);
    await queryRunner.query(`
      CREATE INDEX IF NOT EXISTS "IDX_payment_surcharges_surcharge"
        ON "payment_surcharges" ("surcharge_id")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_payment_surcharges_surcharge"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_payment_surcharges_payment"`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "payment_surcharges"`);
    await queryRunner.query(
      `ALTER TABLE "payments" DROP COLUMN IF EXISTS "late_fee_amount"`,
    );
    await queryRunner.query(`DROP INDEX IF EXISTS "UQ_surcharges_name"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "surcharges"`);
  }
}
