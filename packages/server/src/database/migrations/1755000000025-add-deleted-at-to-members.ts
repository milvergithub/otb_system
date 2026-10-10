import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Logical deletion (soft delete) for members.
 *
 * - Adds a nullable `deleted_at` column to `members`. `NULL` means the member is
 *   active; a value means the member was logically removed and is excluded from
 *   normal queries, selectors and new operations while its historical records
 *   (payments, fines, attendances, contributions, finance movements) survive.
 * - The column is indexed so filtering deleted members stays cheap.
 *
 * Additive and idempotent. No rows are physically deleted and no foreign key is
 * dropped or added: the FKs of other modules keep referencing the row.
 */
export class AddDeletedAtToMembers1755000000025 implements MigrationInterface {
  name = 'AddDeletedAtToMembers1755000000025';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "members" ADD COLUMN IF NOT EXISTS "deleted_at" TIMESTAMP`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_members_deleted_at" ON "members" ("deleted_at")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_members_deleted_at"`);
    await queryRunner.query(
      `ALTER TABLE "members" DROP COLUMN IF EXISTS "deleted_at"`,
    );
  }
}
