import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddEvidenceKeyToSharePayments1755000000012 implements MigrationInterface {
  name = 'AddEvidenceKeyToSharePayments1755000000012';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "share_payments" ADD "evidence_key" character varying(500)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "share_payments" DROP COLUMN "evidence_key"`,
    );
  }
}
