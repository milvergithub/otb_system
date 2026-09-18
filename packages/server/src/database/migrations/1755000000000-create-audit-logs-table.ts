import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateAuditLogsTable1755000000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "audit_logs" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "user_id" uuid,
        "action" character varying(20) NOT NULL,
        "entity" character varying(50) NOT NULL,
        "entity_id" character varying(100) NOT NULL,
        "old_values" jsonb,
        "new_values" jsonb,
        "ip_address" character varying(45),
        "user_agent" text,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_audit_logs" PRIMARY KEY ("id")
      )`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_audit_entity_created" ON "audit_logs" ("entity", "created_at")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_audit_user_created" ON "audit_logs" ("user_id", "created_at")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_audit_action_entity" ON "audit_logs" ("action", "entity")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_audit_entity_id" ON "audit_logs" ("entity_id", "entity")`,
    );
    await queryRunner.query(
      `ALTER TABLE "audit_logs" ADD CONSTRAINT "FK_audit_user" FOREIGN KEY ("user_id") REFERENCES "users" ("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "audit_logs" DROP CONSTRAINT "FK_audit_user"`,
    );
    await queryRunner.query(`DROP INDEX "IDX_audit_entity_id"`);
    await queryRunner.query(`DROP INDEX "IDX_audit_action_entity"`);
    await queryRunner.query(`DROP INDEX "IDX_audit_user_created"`);
    await queryRunner.query(`DROP INDEX "IDX_audit_entity_created"`);
    await queryRunner.query(`DROP TABLE "audit_logs"`);
  }
}
