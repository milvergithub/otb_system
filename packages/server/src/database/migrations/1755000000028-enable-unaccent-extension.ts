import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Accent-insensitive member search.
 *
 * - Creates the `unaccent` PostgreSQL extension (if missing). The members list
 *   query wraps both sides of its ILIKE comparisons in `unaccent()` so that
 *   "jose" matches "José" and "martinez" matches "Martínez".
 *
 * Additive and idempotent. The down() is a no-op on purpose: the extension is
 * harmless to keep and other objects may depend on it.
 */
export class EnableUnaccentExtension1755000000028 implements MigrationInterface {
  name = 'EnableUnaccentExtension1755000000028';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "unaccent"`);
  }

  public async down(_queryRunner: QueryRunner): Promise<void> {
    // Intentionally empty: dropping the extension would break any query or
    // generated column that still calls unaccent().
  }
}
