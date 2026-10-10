import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Contributions (aportes económicos extraordinarios).
 *
 * - `contributions`: campaign header (draft → active → paused/completed/cancelled).
 * - `contribution_obligations`: one row per included member; the amount is
 *   frozen at inclusion time and the status (pending/partial/paid/exonerated/
 *   cancelled) is derived from the sum of its active payments.
 * - `contribution_payments`: payment rows; the ledger income lives in
 *   `finance_transactions` with `source_type = 'contribution_payment'` and
 *   `source_id = payment.id`, written in the same transaction.
 *
 * Additive and idempotent; safe on fresh and legacy databases.
 */
export class CreateContributionsTables1755000000022 implements MigrationInterface {
  name = 'CreateContributionsTables1755000000022';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "contributions" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "title" character varying(200) NOT NULL,
        "purpose" text,
        "amount_per_member" numeric(10,2) NOT NULL,
        "status" character varying(20) NOT NULL DEFAULT 'draft',
        "collector_user_id" uuid,
        "responsible_user_id" uuid,
        "created_by" uuid NOT NULL,
        "activated_at" timestamp,
        "completed_at" timestamp,
        "cancelled_at" timestamp,
        "cancel_reason" text,
        "notes" text,
        "created_at" timestamp NOT NULL DEFAULT now(),
        "updated_at" timestamp NOT NULL DEFAULT now(),
        CONSTRAINT "PK_contributions" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "contribution_obligations" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "contribution_id" uuid NOT NULL,
        "member_id" uuid NOT NULL,
        "amount" numeric(10,2) NOT NULL,
        "status" character varying(20) NOT NULL DEFAULT 'pending',
        "exonerated_reason" text,
        "exonerated_by" uuid,
        "exonerated_at" timestamp,
        "cancel_reason" text,
        "paid_at" timestamp,
        "created_by" uuid NOT NULL,
        "created_at" timestamp NOT NULL DEFAULT now(),
        "updated_at" timestamp NOT NULL DEFAULT now(),
        CONSTRAINT "PK_contribution_obligations" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_contribution_obligations_contribution_member"
          UNIQUE ("contribution_id", "member_id")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "contribution_payments" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "obligation_id" uuid NOT NULL,
        "contribution_id" uuid NOT NULL,
        "member_id" uuid,
        "amount" numeric(10,2) NOT NULL,
        "payment_method" character varying(50),
        "reference" character varying(100),
        "notes" text,
        "evidence_key" character varying(500),
        "collector_user_id" uuid,
        "registered_by_user_id" uuid,
        "paid_at" date NOT NULL,
        "status" character varying(20) NOT NULL DEFAULT 'active',
        "voided_at" timestamp,
        "voided_reason" text,
        "voided_by" uuid,
        "created_at" timestamp NOT NULL DEFAULT now(),
        "updated_at" timestamp NOT NULL DEFAULT now(),
        CONSTRAINT "PK_contribution_payments" PRIMARY KEY ("id")
      )
    `);

    // Foreign keys (idempotent).
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint
          WHERE conrelid = 'contributions'::regclass AND contype = 'f'
            AND conname = 'FK_contributions_collector_user'
        ) THEN
          ALTER TABLE "contributions"
            ADD CONSTRAINT "FK_contributions_collector_user"
            FOREIGN KEY ("collector_user_id") REFERENCES "users"("id")
            ON DELETE SET NULL;
        END IF;

        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint
          WHERE conrelid = 'contributions'::regclass AND contype = 'f'
            AND conname = 'FK_contributions_responsible_user'
        ) THEN
          ALTER TABLE "contributions"
            ADD CONSTRAINT "FK_contributions_responsible_user"
            FOREIGN KEY ("responsible_user_id") REFERENCES "users"("id")
            ON DELETE SET NULL;
        END IF;

        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint
          WHERE conrelid = 'contributions'::regclass AND contype = 'f'
            AND conname = 'FK_contributions_created_by'
        ) THEN
          ALTER TABLE "contributions"
            ADD CONSTRAINT "FK_contributions_created_by"
            FOREIGN KEY ("created_by") REFERENCES "users"("id")
            ON DELETE RESTRICT;
        END IF;

        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint
          WHERE conrelid = 'contribution_obligations'::regclass AND contype = 'f'
            AND conname = 'FK_contribution_obligations_contribution'
        ) THEN
          ALTER TABLE "contribution_obligations"
            ADD CONSTRAINT "FK_contribution_obligations_contribution"
            FOREIGN KEY ("contribution_id") REFERENCES "contributions"("id")
            ON DELETE CASCADE;
        END IF;

        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint
          WHERE conrelid = 'contribution_obligations'::regclass AND contype = 'f'
            AND conname = 'FK_contribution_obligations_member'
        ) THEN
          ALTER TABLE "contribution_obligations"
            ADD CONSTRAINT "FK_contribution_obligations_member"
            FOREIGN KEY ("member_id") REFERENCES "members"("id")
            ON DELETE RESTRICT;
        END IF;

        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint
          WHERE conrelid = 'contribution_payments'::regclass AND contype = 'f'
            AND conname = 'FK_contribution_payments_obligation'
        ) THEN
          ALTER TABLE "contribution_payments"
            ADD CONSTRAINT "FK_contribution_payments_obligation"
            FOREIGN KEY ("obligation_id") REFERENCES "contribution_obligations"("id")
            ON DELETE CASCADE;
        END IF;

        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint
          WHERE conrelid = 'contribution_payments'::regclass AND contype = 'f'
            AND conname = 'FK_contribution_payments_contribution'
        ) THEN
          ALTER TABLE "contribution_payments"
            ADD CONSTRAINT "FK_contribution_payments_contribution"
            FOREIGN KEY ("contribution_id") REFERENCES "contributions"("id")
            ON DELETE CASCADE;
        END IF;

        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint
          WHERE conrelid = 'contribution_payments'::regclass AND contype = 'f'
            AND conname = 'FK_contribution_payments_member'
        ) THEN
          ALTER TABLE "contribution_payments"
            ADD CONSTRAINT "FK_contribution_payments_member"
            FOREIGN KEY ("member_id") REFERENCES "members"("id")
            ON DELETE SET NULL;
        END IF;

        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint
          WHERE conrelid = 'contribution_payments'::regclass AND contype = 'f'
            AND conname = 'FK_contribution_payments_collector_user'
        ) THEN
          ALTER TABLE "contribution_payments"
            ADD CONSTRAINT "FK_contribution_payments_collector_user"
            FOREIGN KEY ("collector_user_id") REFERENCES "users"("id")
            ON DELETE SET NULL;
        END IF;

        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint
          WHERE conrelid = 'contribution_payments'::regclass AND contype = 'f'
            AND conname = 'FK_contribution_payments_registered_by'
        ) THEN
          ALTER TABLE "contribution_payments"
            ADD CONSTRAINT "FK_contribution_payments_registered_by"
            FOREIGN KEY ("registered_by_user_id") REFERENCES "users"("id")
            ON DELETE SET NULL;
        END IF;

        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint
          WHERE conrelid = 'contribution_payments'::regclass AND contype = 'f'
            AND conname = 'FK_contribution_payments_voided_by'
        ) THEN
          ALTER TABLE "contribution_payments"
            ADD CONSTRAINT "FK_contribution_payments_voided_by"
            FOREIGN KEY ("voided_by") REFERENCES "users"("id")
            ON DELETE SET NULL;
        END IF;
      END $$;
    `);

    // Indexes.
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_contributions_status" ON "contributions" ("status")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_contributions_collector_user_id" ON "contributions" ("collector_user_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_contributions_responsible_user_id" ON "contributions" ("responsible_user_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_contributions_created_by" ON "contributions" ("created_by")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_contribution_obligations_contribution" ON "contribution_obligations" ("contribution_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_contribution_obligations_member" ON "contribution_obligations" ("member_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_contribution_payments_contribution_status" ON "contribution_payments" ("contribution_id", "status")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_contribution_payments_obligation_status" ON "contribution_payments" ("obligation_id", "status")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_contribution_payments_member_id" ON "contribution_payments" ("member_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP TABLE IF EXISTS "contribution_payments" CASCADE`,
    );
    await queryRunner.query(
      `DROP TABLE IF EXISTS "contribution_obligations" CASCADE`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "contributions" CASCADE`);
  }
}
