import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateMeterTypesAndAlterMeters1755000000003 implements MigrationInterface {
  name = 'CreateMeterTypesAndAlterMeters1755000000003';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create meter_types table if not exists
    const hasTable = await queryRunner.hasTable('meter_types');
    if (!hasTable) {
      await queryRunner.query(`
        CREATE TABLE "meter_types" (
          "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          "name" VARCHAR(50) NOT NULL UNIQUE,
          "created_at" TIMESTAMP NOT NULL DEFAULT now(),
          "updated_at" TIMESTAMP NOT NULL DEFAULT now()
        )
      `);
    }

    // Seed default types
    await queryRunner.query(`
      INSERT INTO "meter_types" ("name") VALUES
        ('residential'),
        ('commercial'),
        ('vacant_lot')
      ON CONFLICT ("name") DO NOTHING
    `);

    // Add type_id column to meters if not exists
    const hasTypeId = await queryRunner.hasColumn('meters', 'type_id');
    if (!hasTypeId) {
      await queryRunner.query(`ALTER TABLE "meters" ADD COLUMN "type_id" UUID`);
    }

    // Migrate existing data from old 'type' column if it still exists
    const hasOldType = await queryRunner.hasColumn('meters', 'type');
    if (hasOldType) {
      await queryRunner.query(`
        UPDATE "meters" SET "type_id" = (
          SELECT "id" FROM "meter_types" WHERE "name" = "meters"."type"
        )
      `);
      await queryRunner.query(`ALTER TABLE "meters" DROP COLUMN "type"`);
    }

    // Set default for any nulls
    await queryRunner.query(`
      UPDATE "meters" SET "type_id" = (
        SELECT "id" FROM "meter_types" WHERE "name" = 'residential'
      ) WHERE "type_id" IS NULL
    `);

    // Make type_id NOT NULL
    await queryRunner.query(`
      ALTER TABLE "meters" ALTER COLUMN "type_id" SET NOT NULL
    `);

    // Add FK constraint if not exists
    const hasFK = await queryRunner.query(`
      SELECT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'FK_meters_meter_type'
      ) as exists
    `);
    if (!hasFK[0].exists) {
      await queryRunner.query(`
        ALTER TABLE "meters"
          ADD CONSTRAINT "FK_meters_meter_type"
          FOREIGN KEY ("type_id") REFERENCES "meter_types"("id")
          ON DELETE SET NULL
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "meters" DROP CONSTRAINT IF EXISTS "FK_meters_meter_type"`,
    );
    await queryRunner.query(
      `ALTER TABLE "meters" DROP COLUMN IF EXISTS "type_id"`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "meter_types"`);
  }
}
