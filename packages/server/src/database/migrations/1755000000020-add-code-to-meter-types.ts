import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Meter type codes.
 *
 * - meter_types.code: short unique identifier (e.g. RESIDENTIAL), normalised
 *   to uppercase, mirroring activity_types.code.
 * - Backfills existing rows from their name, disambiguating case-only
 *   collisions with a numeric suffix so the unique index can be created.
 *
 * Additive and idempotent.
 */
export class AddCodeToMeterTypes1755000000020 implements MigrationInterface {
  name = 'AddCodeToMeterTypes1755000000020';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "meter_types" ADD COLUMN IF NOT EXISTS "code" varchar(30)`,
    );

    await queryRunner.query(`
      UPDATE "meter_types" m
      SET "code" = LEFT(d.base, 27) ||
        CASE WHEN d.rn > 1 THEN '-' || d.rn ELSE '' END
      FROM (
        SELECT
          "id",
          LEFT(UPPER(TRIM("name")), 27) AS base,
          ROW_NUMBER() OVER (
            PARTITION BY LEFT(UPPER(TRIM("name")), 27)
            ORDER BY "created_at", "id"
          ) AS rn
        FROM "meter_types"
        WHERE "code" IS NULL OR TRIM("code") = ''
      ) d
      WHERE m."id" = d."id"
    `);

    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "UQ_meter_types_code" ON "meter_types" ("code")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "UQ_meter_types_code"`);
    await queryRunner.query(
      `ALTER TABLE "meter_types" DROP COLUMN IF EXISTS "code"`,
    );
  }
}
