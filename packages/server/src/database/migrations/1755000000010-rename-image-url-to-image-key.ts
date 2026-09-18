import { MigrationInterface, QueryRunner } from 'typeorm';

export class RenameImageUrlToImageKey1755000000010 implements MigrationInterface {
  name = 'RenameImageUrlToImageKey1755000000010';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "consumptions" RENAME COLUMN "image_url" TO "image_key"`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "consumptions" RENAME COLUMN "image_key" TO "image_url"`,
    );
  }
}
