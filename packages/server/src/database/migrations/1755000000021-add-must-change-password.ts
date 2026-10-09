import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Forced password rotation flag.
 *
 * - users.must_change_password: true whenever an account was provisioned by
 *   someone else (created by an admin, or regenerated after an admin reset),
 *   so the holder is expected to replace the temporary secret. Cleared only
 *   by the self-service change endpoint.
 * - Defaults to false, so every pre-existing account is unaffected.
 *
 * Additive and idempotent.
 */
export class AddMustChangePassword1755000000021 implements MigrationInterface {
  name = 'AddMustChangePassword1755000000021';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "must_change_password" boolean NOT NULL DEFAULT false`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "users" DROP COLUMN IF EXISTS "must_change_password"`,
    );
  }
}
