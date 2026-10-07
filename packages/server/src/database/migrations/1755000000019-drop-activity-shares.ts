import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Removes the activity sharing feature.
 *
 * Drops the `activity_shares` table (user ↔ activity access grants). Idempotent:
 * safe on databases where the table never existed (production fresh baseline).
 */
export class DropActivityShares1755000000019 implements MigrationInterface {
  name = 'DropActivityShares1755000000019';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "activity_shares"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "activity_shares" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "activity_id" uuid NOT NULL,
        "user_id" uuid NOT NULL,
        "permission" character varying NOT NULL DEFAULT 'viewer',
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_activity_shares" PRIMARY KEY ("id")
      )
    `);
  }
}
