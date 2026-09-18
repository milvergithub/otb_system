import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateZoneTypesTable1755000000001 implements MigrationInterface {
  name = 'CreateZoneTypesTable1755000000001';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "zone_types" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "name" character varying(50) NOT NULL,
        "default_color" character varying(7) NOT NULL DEFAULT '#3b82f6',
        "default_line_width" integer NOT NULL DEFAULT 3,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_zone_types" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_zone_types_name" UNIQUE ("name")
      )
    `);

    await queryRunner.query(`
      INSERT INTO "zone_types" ("name", "default_color", "default_line_width") VALUES
        ('Zona', '#3b82f6', 3),
        ('Tubería', '#10b981', 3),
        ('Barrio', '#ef4444', 2),
        ('Otro', '#8b5cf6', 3)
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "zone_types"`);
  }
}
