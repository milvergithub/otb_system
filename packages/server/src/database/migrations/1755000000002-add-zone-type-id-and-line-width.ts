import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddZoneTypeIdAndLineWidth1755000000002 implements MigrationInterface {
  name = 'AddZoneTypeIdAndLineWidth1755000000002';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "zones" ADD COLUMN "zone_type_id" uuid`,
    );
    await queryRunner.query(
      `ALTER TABLE "zones" ADD COLUMN "line_width" integer NOT NULL DEFAULT 3`,
    );
    await queryRunner.query(
      `ALTER TABLE "zones" ADD CONSTRAINT "FK_zones_zone_type" FOREIGN KEY ("zone_type_id") REFERENCES "zone_types"("id") ON DELETE SET NULL ON UPDATE NO ACTION`,
    );

    await queryRunner.query(`
      UPDATE "zones" SET "zone_type_id" = (SELECT "id" FROM "zone_types" WHERE "name" = 'Zona') WHERE "type" = 'zone'
    `);
    await queryRunner.query(`
      UPDATE "zones" SET "zone_type_id" = (SELECT "id" FROM "zone_types" WHERE "name" = 'Tubería') WHERE "type" = 'pipeline'
    `);
    await queryRunner.query(`
      UPDATE "zones" SET "zone_type_id" = (SELECT "id" FROM "zone_types" WHERE "name" = 'Barrio') WHERE "type" = 'neighborhood'
    `);
    await queryRunner.query(`
      UPDATE "zones" SET "zone_type_id" = (SELECT "id" FROM "zone_types" WHERE "name" = 'Otro') WHERE "type" = 'other'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "zones" DROP CONSTRAINT "FK_zones_zone_type"`,
    );
    await queryRunner.query(`ALTER TABLE "zones" DROP COLUMN "zone_type_id"`);
    await queryRunner.query(`ALTER TABLE "zones" DROP COLUMN "line_width"`);
  }
}
