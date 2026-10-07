import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Activities domain rebuild.
 *
 * Additive and defensive so it is safe both on a fresh database built from
 * entities (dev synchronize) and on an existing one:
 *
 * - activities: status, type, location, organizer (responsible_user_id) and
 *   attendance/fine flags. The legacy financial_responsible_user_id column is
 *   intentionally left untouched as historical data; it no longer drives the
 *   financial responsibility of new movements.
 * - activity_types: configurable activity types.
 * - activity_attendance_sessions: explicit initial/final control sessions.
 * - attendances: result + who marked each control, with a documented backfill
 *   of the legacy status values.
 * - fine_types.applies_to: which attendance result a fine type applies to.
 * - fines: source, attendance link, issuer and issued_at.
 * - finance_transactions.activity_id: movements can be grouped per activity.
 * - activity_evidences: photos, videos and documents.
 *
 * No historical value is invented: everything new is nullable or defaulted.
 */
export class RebuildActivitiesDomain1755000000017 implements MigrationInterface {
  name = 'RebuildActivitiesDomain1755000000017';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // ---------------------------------------------------------------- types
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "activity_types" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "code" varchar NOT NULL,
        "name" varchar NOT NULL,
        "description" text,
        "is_active" boolean NOT NULL DEFAULT true,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now()
      )
    `);
    await queryRunner.query(
      `CREATE UNIQUE INDEX IF NOT EXISTS "UQ_activity_types_code" ON "activity_types" ("code")`,
    );

    // Default types, only inserted when the table is empty (idempotent).
    await queryRunner.query(`
      INSERT INTO "activity_types" ("code", "name", "is_active")
      SELECT * FROM (VALUES
        ('MEETING', 'Reunión', true),
        ('ASSEMBLY', 'Asamblea', true),
        ('CLEANING', 'Limpieza', true),
        ('MAINTENANCE', 'Mantenimiento', true),
        ('SPORT', 'Deporte', true),
        ('COMMUNITY_WORK', 'Trabajo comunitario', true),
        ('OTHER', 'Otra', true)
      ) AS v(code, name, is_active)
      WHERE NOT EXISTS (SELECT 1 FROM "activity_types")
    `);

    // ------------------------------------------------------------ activities
    await queryRunner.query(
      `ALTER TABLE "activities" ADD COLUMN IF NOT EXISTS "status" varchar(20)`,
    );
    await queryRunner.query(
      `UPDATE "activities" SET "status" = 'scheduled' WHERE "status" IS NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "activities" ALTER COLUMN "status" SET DEFAULT 'scheduled'`,
    );
    await queryRunner.query(
      `ALTER TABLE "activities" ADD COLUMN IF NOT EXISTS "type_id" uuid`,
    );
    await queryRunner.query(
      `ALTER TABLE "activities" ADD COLUMN IF NOT EXISTS "location" varchar(255)`,
    );
    await queryRunner.query(
      `ALTER TABLE "activities" ADD COLUMN IF NOT EXISTS "responsible_user_id" uuid`,
    );
    await queryRunner.query(
      `ALTER TABLE "activities" ADD COLUMN IF NOT EXISTS "attendance_required" boolean`,
    );
    await queryRunner.query(
      `UPDATE "activities" SET "attendance_required" = true WHERE "attendance_required" IS NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "activities" ALTER COLUMN "attendance_required" SET DEFAULT true`,
    );
    await queryRunner.query(
      `ALTER TABLE "activities" ADD COLUMN IF NOT EXISTS "fine_enabled" boolean`,
    );
    await queryRunner.query(
      `UPDATE "activities" SET "fine_enabled" = true WHERE "fine_enabled" IS NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "activities" ALTER COLUMN "fine_enabled" SET DEFAULT true`,
    );

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'FK_activities_type'
        ) THEN
          ALTER TABLE "activities"
            ADD CONSTRAINT "FK_activities_type"
            FOREIGN KEY ("type_id") REFERENCES "activity_types"("id")
            ON DELETE SET NULL;
        END IF;
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'FK_activities_responsible_user'
        ) THEN
          ALTER TABLE "activities"
            ADD CONSTRAINT "FK_activities_responsible_user"
            FOREIGN KEY ("responsible_user_id") REFERENCES "users"("id")
            ON DELETE SET NULL;
        END IF;
      END $$;
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_activities_type_id" ON "activities" ("type_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_activities_status" ON "activities" ("status")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_activities_responsible_user_id" ON "activities" ("responsible_user_id")`,
    );

    // -------------------------------------------------------------- sessions
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "activity_attendance_sessions" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "activity_id" uuid NOT NULL,
        "type" varchar(20) NOT NULL,
        "started_at" timestamptz,
        "ended_at" timestamptz,
        "started_by_user_id" uuid,
        "ended_by_user_id" uuid,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "FK_activity_attendance_sessions_activity"
          FOREIGN KEY ("activity_id") REFERENCES "activities"("id")
          ON DELETE CASCADE,
        CONSTRAINT "FK_activity_attendance_sessions_started_by"
          FOREIGN KEY ("started_by_user_id") REFERENCES "users"("id")
          ON DELETE SET NULL,
        CONSTRAINT "FK_activity_attendance_sessions_ended_by"
          FOREIGN KEY ("ended_by_user_id") REFERENCES "users"("id")
          ON DELETE SET NULL
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_activity_attendance_sessions_activity_id" ON "activity_attendance_sessions" ("activity_id")`,
    );

    // Backfill the sessions that already exist on legacy activities. The
    // original user is unknown for historic controls, so the actor is left NULL
    // instead of being invented.
    await queryRunner.query(`
      INSERT INTO "activity_attendance_sessions"
        ("activity_id", "type", "started_at", "ended_at")
      SELECT a.id, 'initial', a.initial_control_at, a.initial_control_at
      FROM "activities" a
      WHERE a.initial_control_at IS NOT NULL
        AND NOT EXISTS (
          SELECT 1 FROM "activity_attendance_sessions" s
          WHERE s.activity_id = a.id AND s.type = 'initial'
        )
    `);
    await queryRunner.query(`
      INSERT INTO "activity_attendance_sessions"
        ("activity_id", "type", "started_at", "ended_at")
      SELECT a.id, 'final', a.final_control_at, a.final_control_at
      FROM "activities" a
      WHERE a.final_control_at IS NOT NULL
        AND NOT EXISTS (
          SELECT 1 FROM "activity_attendance_sessions" s
          WHERE s.activity_id = a.id AND s.type = 'final'
        )
    `);

    // ----------------------------------------------------------- attendances
    await queryRunner.query(
      `ALTER TABLE "attendances" ADD COLUMN IF NOT EXISTS "result" varchar(20)`,
    );
    await queryRunner.query(
      `ALTER TABLE "attendances" ADD COLUMN IF NOT EXISTS "initial_marked_at" timestamptz`,
    );
    await queryRunner.query(
      `ALTER TABLE "attendances" ADD COLUMN IF NOT EXISTS "initial_marked_by_user_id" uuid`,
    );
    await queryRunner.query(
      `ALTER TABLE "attendances" ADD COLUMN IF NOT EXISTS "final_marked_at" timestamptz`,
    );
    await queryRunner.query(
      `ALTER TABLE "attendances" ADD COLUMN IF NOT EXISTS "final_marked_by_user_id" uuid`,
    );

    // Documented backfill of the legacy status into the explicit result:
    //   present      -> present
    //   absent_start -> late        (was absent at the start, present at the end)
    //   absent_end   -> left_early  (was present at the start, absent at the end)
    //   absent_both  -> absent
    await queryRunner.query(`
      UPDATE "attendances"
      SET "result" = CASE "status"
        WHEN 'present' THEN 'present'
        WHEN 'absent_start' THEN 'late'
        WHEN 'absent_end' THEN 'left_early'
        WHEN 'absent_both' THEN 'absent'
        ELSE NULL
      END
      WHERE "result" IS NULL AND "status" IS NOT NULL
    `);
    await queryRunner.query(`
      UPDATE "attendances" a
      SET "initial_marked_at" = act.initial_control_at
      FROM "activities" act
      WHERE act.id = a.activity_id
        AND a.initial_marked_at IS NULL
        AND a.result IS NOT NULL
    `);

    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'FK_attendances_initial_marked_by'
        ) THEN
          ALTER TABLE "attendances"
            ADD CONSTRAINT "FK_attendances_initial_marked_by"
            FOREIGN KEY ("initial_marked_by_user_id") REFERENCES "users"("id")
            ON DELETE SET NULL;
        END IF;
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'FK_attendances_final_marked_by'
        ) THEN
          ALTER TABLE "attendances"
            ADD CONSTRAINT "FK_attendances_final_marked_by"
            FOREIGN KEY ("final_marked_by_user_id") REFERENCES "users"("id")
            ON DELETE SET NULL;
        END IF;
      END $$;
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_attendances_result" ON "attendances" ("result")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_attendances_activity_id" ON "attendances" ("activity_id")`,
    );

    // ------------------------------------------------------------ fine types
    await queryRunner.query(
      `ALTER TABLE "fine_types" ADD COLUMN IF NOT EXISTS "applies_to" varchar(20)`,
    );
    await queryRunner.query(`
      UPDATE "fine_types"
      SET "applies_to" = CASE "code"
        WHEN 'absent_both' THEN 'absent'
        WHEN 'absent_start' THEN 'late'
        WHEN 'absent_end' THEN 'left_early'
        ELSE NULL
      END
      WHERE "applies_to" IS NULL
    `);

    // ----------------------------------------------------------------- fines
    await queryRunner.query(
      `ALTER TABLE "fines" ADD COLUMN IF NOT EXISTS "source" varchar(20)`,
    );
    await queryRunner.query(
      `UPDATE "fines" SET "source" = 'attendance' WHERE "source" IS NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "fines" ALTER COLUMN "source" SET DEFAULT 'attendance'`,
    );
    await queryRunner.query(
      `ALTER TABLE "fines" ADD COLUMN IF NOT EXISTS "attendance_id" uuid`,
    );
    await queryRunner.query(
      `ALTER TABLE "fines" ADD COLUMN IF NOT EXISTS "created_by_user_id" uuid`,
    );
    await queryRunner.query(
      `ALTER TABLE "fines" ADD COLUMN IF NOT EXISTS "issued_at" timestamptz`,
    );
    // Existing fines were issued by the attendance evaluation; the issue date is
    // unknown so it stays NULL instead of being invented.
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'FK_fines_attendance'
        ) THEN
          ALTER TABLE "fines"
            ADD CONSTRAINT "FK_fines_attendance"
            FOREIGN KEY ("attendance_id") REFERENCES "attendances"("id")
            ON DELETE SET NULL;
        END IF;
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'FK_fines_created_by_user'
        ) THEN
          ALTER TABLE "fines"
            ADD CONSTRAINT "FK_fines_created_by_user"
            FOREIGN KEY ("created_by_user_id") REFERENCES "users"("id")
            ON DELETE SET NULL;
        END IF;
      END $$;
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_fines_activity_id" ON "fines" ("activity_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_fines_member_id" ON "fines" ("member_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_fines_attendance_id" ON "fines" ("attendance_id")`,
    );
    // Integrity: one attendance-generated fine per (attendance, fine type).
    await queryRunner.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "UQ_fines_attendance_fine_type"
      ON "fines" ("attendance_id", "fine_type_id")
      WHERE "attendance_id" IS NOT NULL
    `);

    // --------------------------------------------------------------- finance
    await queryRunner.query(
      `ALTER TABLE "finance_transactions" ADD COLUMN IF NOT EXISTS "activity_id" uuid`,
    );
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'FK_finance_transactions_activity'
        ) THEN
          ALTER TABLE "finance_transactions"
            ADD CONSTRAINT "FK_finance_transactions_activity"
            FOREIGN KEY ("activity_id") REFERENCES "activities"("id")
            ON DELETE SET NULL;
        END IF;
      END $$;
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_finance_transactions_activity_id" ON "finance_transactions" ("activity_id")`,
    );
    // Safe backfill: fine payments unambiguously belong to the fine's activity.
    await queryRunner.query(`
      UPDATE "finance_transactions" ft
      SET "activity_id" = f.activity_id
      FROM "fines" f
      WHERE ft."source_type" = 'fine_payment'
        AND ft."source_id" = f.id::text
        AND ft."activity_id" IS NULL
    `);

    // -------------------------------------------------------------- evidence
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "activity_evidences" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "activity_id" uuid NOT NULL,
        "type" varchar(20) NOT NULL,
        "file_key" varchar NOT NULL,
        "file_name" varchar NOT NULL,
        "mime_type" varchar NOT NULL,
        "size" bigint,
        "description" text,
        "uploaded_by_user_id" uuid,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "FK_activity_evidences_activity"
          FOREIGN KEY ("activity_id") REFERENCES "activities"("id")
          ON DELETE CASCADE,
        CONSTRAINT "FK_activity_evidences_uploaded_by"
          FOREIGN KEY ("uploaded_by_user_id") REFERENCES "users"("id")
          ON DELETE SET NULL
      )
    `);
    await queryRunner.query(
      `CREATE INDEX IF NOT EXISTS "IDX_activity_evidences_activity_id" ON "activity_evidences" ("activity_id")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "activity_evidences"`);
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_finance_transactions_activity_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "finance_transactions" DROP CONSTRAINT IF EXISTS "FK_finance_transactions_activity"`,
    );
    await queryRunner.query(
      `ALTER TABLE "finance_transactions" DROP COLUMN IF EXISTS "activity_id"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "UQ_fines_attendance_fine_type"`,
    );
    await queryRunner.query(
      `ALTER TABLE "fines" DROP COLUMN IF EXISTS "issued_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "fines" DROP COLUMN IF EXISTS "created_by_user_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "fines" DROP COLUMN IF EXISTS "attendance_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "fines" DROP COLUMN IF EXISTS "source"`,
    );
    await queryRunner.query(
      `ALTER TABLE "fine_types" DROP COLUMN IF EXISTS "applies_to"`,
    );
    await queryRunner.query(
      `ALTER TABLE "attendances" DROP COLUMN IF EXISTS "final_marked_by_user_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "attendances" DROP COLUMN IF EXISTS "final_marked_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "attendances" DROP COLUMN IF EXISTS "initial_marked_by_user_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "attendances" DROP COLUMN IF EXISTS "initial_marked_at"`,
    );
    await queryRunner.query(
      `ALTER TABLE "attendances" DROP COLUMN IF EXISTS "result"`,
    );
    await queryRunner.query(
      `DROP TABLE IF EXISTS "activity_attendance_sessions"`,
    );
    await queryRunner.query(
      `ALTER TABLE "activities" DROP COLUMN IF EXISTS "fine_enabled"`,
    );
    await queryRunner.query(
      `ALTER TABLE "activities" DROP COLUMN IF EXISTS "attendance_required"`,
    );
    await queryRunner.query(
      `ALTER TABLE "activities" DROP COLUMN IF EXISTS "responsible_user_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "activities" DROP COLUMN IF EXISTS "location"`,
    );
    await queryRunner.query(
      `ALTER TABLE "activities" DROP COLUMN IF EXISTS "type_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "activities" DROP COLUMN IF EXISTS "status"`,
    );
    await queryRunner.query(`DROP TABLE IF EXISTS "activity_types"`);
  }
}
