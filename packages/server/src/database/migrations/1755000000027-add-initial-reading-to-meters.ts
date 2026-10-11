import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddInitialReadingToMeters1755000000027 implements MigrationInterface {
  name = 'AddInitialReadingToMeters1755000000027';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "meters" ADD "initial_reading" numeric(10,2) DEFAULT null`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "meters" DROP COLUMN "initial_reading"`,
    );
  }
}
