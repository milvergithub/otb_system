import { MigrationInterface, QueryRunner } from 'typeorm';

export class RenameAtividadesToActivities1755000000008 implements MigrationInterface {
  name = 'RenameAtividadesToActivities1755000000008';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE "permissions"
      SET "resource" = 'activities',
          "name" = REPLACE("name", 'atividades', 'activities'),
          "description" = REPLACE("description", 'atividades', 'activities')
      WHERE "resource" = 'atividades'
    `);
    // Ensure friendly descriptions (handles both previous secretarias->atividades and direct)
    await queryRunner.query(
      `UPDATE "permissions" SET "description" = 'View activities' WHERE "name" = 'activities.read'`,
    );
    await queryRunner.query(
      `UPDATE "permissions" SET "description" = 'Create activities' WHERE "name" = 'activities.create'`,
    );
    await queryRunner.query(
      `UPDATE "permissions" SET "description" = 'Update activities' WHERE "name" = 'activities.update'`,
    );
    await queryRunner.query(
      `UPDATE "permissions" SET "description" = 'Delete activities' WHERE "name" = 'activities.delete'`,
    );
    // Also handle legacy secretarias if migration 0007 not yet run
    await queryRunner.query(`
      UPDATE "permissions"
      SET "resource" = 'activities',
          "name" = REPLACE("name", 'secretarias', 'activities'),
          "description" = REPLACE("description", 'secretarias', 'activities')
      WHERE "resource" = 'secretarias'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE "permissions"
      SET "resource" = 'atividades',
          "name" = REPLACE("name", 'activities', 'atividades'),
          "description" = REPLACE("description", 'activities', 'atividades')
      WHERE "resource" = 'activities'
    `);
  }
}
