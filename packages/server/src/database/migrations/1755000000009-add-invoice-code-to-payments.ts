import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddInvoiceCodeToPayments1755000000009 implements MigrationInterface {
  name = 'AddInvoiceCodeToPayments1755000000009';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const hasColumn = await queryRunner.hasColumn('payments', 'invoice_code');
    if (!hasColumn) {
      await queryRunner.query(
        `ALTER TABLE "payments" ADD COLUMN "invoice_code" character varying(100)`,
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const hasColumn = await queryRunner.hasColumn('payments', 'invoice_code');
    if (hasColumn) {
      await queryRunner.query(
        `ALTER TABLE "payments" DROP COLUMN "invoice_code"`,
      );
    }
  }
}
