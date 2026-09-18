import { MigrationInterface, QueryRunner } from 'typeorm';

async function dropForeignKeysForColumns(
  queryRunner: QueryRunner,
  table: string,
  columns: string[],
): Promise<void> {
  for (const column of columns) {
    const rows: { conname: string }[] = await queryRunner.query(
      `SELECT c.conname
         FROM pg_constraint c
         JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = ANY(c.conkey)
        WHERE c.conrelid = '${table}'::regclass
          AND c.contype = 'f'
          AND a.attname = '${column}'`,
    );
    for (const row of rows) {
      await queryRunner.query(
        `ALTER TABLE "${table}" DROP CONSTRAINT "${row.conname}"`,
      );
    }
  }
}

export class FineAttendanceRelations1755000000006 implements MigrationInterface {
  Name = 'FineAttendanceRelations1755000000006';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const hasMemberId = await queryRunner.hasColumn('fines', 'member_id');
    if (!hasMemberId) return;

    await queryRunner.query(
      `ALTER TABLE "fines"
         DROP COLUMN IF EXISTS "memberId",
         DROP COLUMN IF EXISTS "activityId",
         DROP COLUMN IF EXISTS "fineTypeId"`,
    );

    await dropForeignKeysForColumns(queryRunner, 'fines', [
      'member_id',
      'activity_id',
      'fine_type_id',
    ]);

    await queryRunner.query(
      `ALTER TABLE "fines"
         ALTER COLUMN "member_id" TYPE uuid USING "member_id"::uuid,
         ALTER COLUMN "activity_id" TYPE uuid USING "activity_id"::uuid,
         ALTER COLUMN "fine_type_id" TYPE uuid USING "fine_type_id"::uuid`,
    );

    await queryRunner.query(
      `ALTER TABLE "fines"
         ADD CONSTRAINT "FK_fines_member_id" FOREIGN KEY ("member_id") REFERENCES "members"("id") ON DELETE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE "fines"
         ADD CONSTRAINT "FK_fines_activity_id" FOREIGN KEY ("activity_id") REFERENCES "activities"("id") ON DELETE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE "fines"
         ADD CONSTRAINT "FK_fines_fine_type_id" FOREIGN KEY ("fine_type_id") REFERENCES "fine_types"("id")`,
    );

    const hasAttendanceMemberId = await queryRunner.hasColumn(
      'attendances',
      'member_id',
    );
    if (!hasAttendanceMemberId) return;

    await queryRunner.query(
      `ALTER TABLE "attendances"
         DROP COLUMN IF EXISTS "memberId",
         DROP COLUMN IF EXISTS "activityId"`,
    );

    await dropForeignKeysForColumns(queryRunner, 'attendances', [
      'member_id',
      'activity_id',
    ]);

    await queryRunner.query(
      `ALTER TABLE "attendances"
         ALTER COLUMN "member_id" TYPE uuid USING "member_id"::uuid,
         ALTER COLUMN "activity_id" TYPE uuid USING "activity_id"::uuid`,
    );

    await queryRunner.query(
      `ALTER TABLE "attendances"
         ADD CONSTRAINT "FK_attendances_member_id" FOREIGN KEY ("member_id") REFERENCES "members"("id") ON DELETE CASCADE`,
    );
    await queryRunner.query(
      `ALTER TABLE "attendances"
         ADD CONSTRAINT "FK_attendances_activity_id" FOREIGN KEY ("activity_id") REFERENCES "activities"("id") ON DELETE CASCADE`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await dropForeignKeysForColumns(queryRunner, 'fines', [
      'member_id',
      'activity_id',
      'fine_type_id',
    ]);

    await queryRunner.query(
      `ALTER TABLE "fines"
         ALTER COLUMN "member_id" TYPE varchar USING "member_id"::text,
         ALTER COLUMN "activity_id" TYPE varchar USING "activity_id"::text,
         ALTER COLUMN "fine_type_id" TYPE varchar USING "fine_type_id"::text`,
    );

    await queryRunner.query(
      `ALTER TABLE "fines"
         ADD COLUMN IF NOT EXISTS "memberId" uuid,
         ADD COLUMN IF NOT EXISTS "activityId" uuid,
         ADD COLUMN IF NOT EXISTS "fineTypeId" uuid`,
    );

    await dropForeignKeysForColumns(queryRunner, 'attendances', [
      'member_id',
      'activity_id',
    ]);

    await queryRunner.query(
      `ALTER TABLE "attendances"
         ALTER COLUMN "member_id" TYPE varchar USING "member_id"::text,
         ALTER COLUMN "activity_id" TYPE varchar USING "activity_id"::text`,
    );

    await queryRunner.query(
      `ALTER TABLE "attendances"
         ADD COLUMN IF NOT EXISTS "memberId" uuid,
         ADD COLUMN IF NOT EXISTS "activityId" uuid`,
    );
  }
}
