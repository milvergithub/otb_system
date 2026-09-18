import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddEvidenceKeyToPaymentHistory1755000000011 implements MigrationInterface {
  name = 'AddEvidenceKeyToPaymentHistory1755000000011';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "payment_history" ADD "evidence_key" character varying(500)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "payment_history" DROP COLUMN "evidence_key"`,
    );
  }
}
