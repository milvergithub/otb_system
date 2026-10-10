import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Configurable payment methods table.
 *
 * - Creates `payment_methods` (id, code, name) mirroring `meter_types`/
 *   `activity_types`. Existing `payment_method` columns across the payment
 *   tables keep storing the code, so nothing is migrated.
 *
 * Additive and idempotent.
 */
export class CreatePaymentMethods1755000000026 implements MigrationInterface {
  name = 'CreatePaymentMethods1755000000026';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS "payment_methods" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "code" character varying(30) NOT NULL,
        "name" character varying(50) NOT NULL,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_payment_methods" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_payment_methods_code" UNIQUE ("code"),
        CONSTRAINT "UQ_payment_methods_name" UNIQUE ("name")
      )`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_payment_methods_code" ON "payment_methods" ("code")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_payment_methods_code"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "payment_methods"`);
  }
}
