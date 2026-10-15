import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Adds `surcharges.is_default`. Migration 29 created the table without it, so
 * existing production databases (and fresh baselines that reach migration 29)
 * need this additive, idempotent step. Fresh databases get the column either
 * from entity sync (baseline) or from this migration.
 */
export class AddSurchargeIsDefault1755000000030 implements MigrationInterface {
  name = 'AddSurchargeIsDefault1755000000030';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "surcharges"
        ADD COLUMN IF NOT EXISTS "is_default" boolean NOT NULL DEFAULT false
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      ALTER TABLE "surcharges" DROP COLUMN IF EXISTS "is_default"
    `);
  }
}
