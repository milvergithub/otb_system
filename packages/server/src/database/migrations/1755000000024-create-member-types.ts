import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Member types catalogue.
 *
 * - Creates `member_types` (configurable socio categories) with a stable unique
 *   `code`, a visible `name`, an optional `description`, an `is_active` flag and
 *   a `sort_order` for presentation.
 * - Adds a nullable `member_type_id` to `members` with an `ON DELETE SET NULL`
 *   foreign key so existing members keep working and deleting a referenced type
 *   never removes members.
 *
 * Additive and idempotent. No default categories are inserted.
 */
export class CreateMemberTypes1755000000024 implements MigrationInterface {
  name = 'CreateMemberTypes1755000000024';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "member_types" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "code" varchar(30) NOT NULL,
        "name" varchar(50) NOT NULL,
        "description" text,
        "is_active" boolean NOT NULL DEFAULT true,
        "sort_order" integer NOT NULL DEFAULT 0,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_member_types_id" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "UQ_member_types_code" ON "member_types" ("code")`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "UQ_member_types_name" ON "member_types" ("name")`,
    );

    await queryRunner.query(
      `ALTER TABLE "members" ADD COLUMN IF NOT EXISTS "member_type_id" uuid`,
    );

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'FK_members_member_type'
        ) THEN
          ALTER TABLE "members"
            ADD CONSTRAINT "FK_members_member_type"
            FOREIGN KEY ("member_type_id")
            REFERENCES "member_types" ("id")
            ON DELETE SET NULL ON UPDATE NO ACTION;
        END IF;
      END
      $$;
    `);

    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_members_member_type_id" ON "members" ("member_type_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_members_member_type_id"`,
    );
    await queryRunner.query(`
      DO $$
      BEGIN
        IF EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'FK_members_member_type'
        ) THEN
          ALTER TABLE "members" DROP CONSTRAINT "FK_members_member_type";
        END IF;
      END
      $$;
    `);
    await queryRunner.query(
      `ALTER TABLE "members" DROP COLUMN IF EXISTS "member_type_id"`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "member_types"`);
  }
}
