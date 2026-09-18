import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddTypeIdToBaseTariffs1755000000004 implements MigrationInterface {
  Name = 'AddTypeIdToBaseTariffs1755000000004';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add type_id column to base_tariffs
    const hasColumn = await queryRunner.hasColumn('base_tariffs', 'type_id');
    if (!hasColumn) {
      await queryRunner.query(
        `ALTER TABLE "base_tariffs" ADD COLUMN "type_id" UUID`,
      );
    }

    // Add FK constraint if not exists
    const hasFK = await queryRunner.query(`
      SELECT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'FK_base_tariffs_meter_type'
      ) as exists
    `);
    if (!hasFK[0].exists) {
      await queryRunner.query(`
        ALTER TABLE "base_tariffs"
          ADD CONSTRAINT "FK_base_tariffs_meter_type"
          FOREIGN KEY ("type_id") REFERENCES "meter_types"("id")
          ON DELETE SET NULL
      `);
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "base_tariffs" DROP CONSTRAINT IF EXISTS "FK_base_tariffs_meter_type"`,
    );
    await queryRunner.query(
      `ALTER TABLE "base_tariffs" DROP COLUMN IF EXISTS "type_id"`,
    );
  }
}
