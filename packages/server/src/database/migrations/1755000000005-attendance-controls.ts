import { MigrationInterface, QueryRunner } from 'typeorm';

export class AttendanceControls1755000000005 implements MigrationInterface {
  Name = 'AttendanceControls1755000000005';

  public async up(queryRunner: QueryRunner): Promise<void> {
    const hasCheckInStart = await queryRunner.hasColumn(
      'activities',
      'check_in_start',
    );

    if (hasCheckInStart) {
      await queryRunner.query(
        `ALTER TABLE "activities"
         DROP COLUMN IF EXISTS "check_in_start",
         DROP COLUMN IF EXISTS "check_in_end",
         DROP COLUMN IF EXISTS "check_out_start",
         DROP COLUMN IF EXISTS "check_out_end"`,
      );
    }

    const hasInitialControlAt = await queryRunner.hasColumn(
      'activities',
      'initial_control_at',
    );
    if (!hasInitialControlAt) {
      await queryRunner.query(
        `ALTER TABLE "activities" ADD COLUMN "initial_control_at" TIMESTAMP`,
      );
      await queryRunner.query(
        `ALTER TABLE "activities" ADD COLUMN "final_control_at" TIMESTAMP`,
      );
    }

    const hasCheckInTime = await queryRunner.hasColumn(
      'attendances',
      'check_in_time',
    );
    if (hasCheckInTime) {
      await queryRunner.query(
        `ALTER TABLE "attendances" ADD COLUMN "present_at_start" boolean NOT NULL DEFAULT false`,
      );
      await queryRunner.query(
        `ALTER TABLE "attendances" ADD COLUMN "present_at_end" boolean NOT NULL DEFAULT false`,
      );
      await queryRunner.query(
        `ALTER TABLE "attendances" ADD COLUMN "checked_at_start" TIMESTAMP`,
      );
      await queryRunner.query(
        `ALTER TABLE "attendances" ADD COLUMN "checked_at_end" TIMESTAMP`,
      );
      await queryRunner.query(
        `UPDATE "attendances" SET "present_at_start" = true, "checked_at_start" = "check_in_time" WHERE "check_in_time" IS NOT NULL`,
      );
      await queryRunner.query(
        `UPDATE "attendances" SET "present_at_end" = true, "checked_at_end" = "check_out_time" WHERE "check_out_time" IS NOT NULL`,
      );
      await queryRunner.query(
        `UPDATE "attendances" SET "status" = CASE
           WHEN "present_at_start" AND "present_at_end" THEN 'present'
           WHEN NOT "present_at_start" AND "present_at_end" THEN 'absent_start'
           WHEN "present_at_start" AND NOT "present_at_end" THEN 'absent_end'
           ELSE 'absent_both'
         END`,
      );
      await queryRunner.query(
        `ALTER TABLE "attendances"
         DROP COLUMN IF EXISTS "check_in_time",
         DROP COLUMN IF EXISTS "check_out_time"`,
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    const hasCheckInTime = await queryRunner.hasColumn(
      'attendances',
      'check_in_time',
    );
    if (!hasCheckInTime) {
      await queryRunner.query(
        `ALTER TABLE "attendances" ADD COLUMN "check_in_time" TIMESTAMP`,
      );
      await queryRunner.query(
        `ALTER TABLE "attendances" ADD COLUMN "check_out_time" TIMESTAMP`,
      );
      await queryRunner.query(
        `UPDATE "attendances" SET "check_in_time" = "checked_at_start" WHERE "present_at_start" = true`,
      );
      await queryRunner.query(
        `UPDATE "attendances" SET "check_out_time" = "checked_at_end" WHERE "present_at_end" = true`,
      );
      await queryRunner.query(
        `ALTER TABLE "attendances"
         DROP COLUMN IF EXISTS "present_at_start",
         DROP COLUMN IF EXISTS "present_at_end",
         DROP COLUMN IF EXISTS "checked_at_start",
         DROP COLUMN IF EXISTS "checked_at_end"`,
      );
    }

    const hasInitialControlAt = await queryRunner.hasColumn(
      'activities',
      'initial_control_at',
    );
    if (hasInitialControlAt) {
      await queryRunner.query(
        `ALTER TABLE "activities"
         DROP COLUMN IF EXISTS "initial_control_at",
         DROP COLUMN IF EXISTS "final_control_at"`,
      );
    }

    const hasCheckInStart = await queryRunner.hasColumn(
      'activities',
      'check_in_start',
    );
    if (!hasCheckInStart) {
      await queryRunner.query(
        `ALTER TABLE "activities"
         ADD COLUMN "check_in_start" time NOT NULL DEFAULT '00:00',
         ADD COLUMN "check_in_end" time NOT NULL DEFAULT '00:00',
         ADD COLUMN "check_out_start" time NOT NULL DEFAULT '00:00',
         ADD COLUMN "check_out_end" time NOT NULL DEFAULT '00:00'`,
      );
    }
  }
}
