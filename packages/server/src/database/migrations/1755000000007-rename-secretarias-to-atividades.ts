import { MigrationInterface, QueryRunner } from 'typeorm';

export class RenameSecretariasToAtividades1755000000007 implements MigrationInterface {
  name = 'RenameSecretariasToAtividades1755000000007';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE "permissions"
      SET "resource" = 'atividades',
          "name" = REPLACE("name", 'secretarias', 'atividades'),
          "description" = REPLACE("description", 'secretarias', 'atividades')
      WHERE "resource" = 'secretarias'
    `);
    // Descriptions seeded as 'View secretarias' etc - ensure friendly
    await queryRunner.query(`
      UPDATE "permissions" SET "description" = 'View atividades' WHERE "name" = 'atividades.read'
    `);
    await queryRunner.query(`
      UPDATE "permissions" SET "description" = 'Create atividades' WHERE "name" = 'atividades.create'
    `);
    await queryRunner.query(`
      UPDATE "permissions" SET "description" = 'Update atividades' WHERE "name" = 'atividades.update'
    `);
    await queryRunner.query(`
      UPDATE "permissions" SET "description" = 'Delete atividades' WHERE "name" = 'atividades.delete'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      UPDATE "permissions"
      SET "resource" = 'secretarias',
          "name" = REPLACE("name", 'atividades', 'secretarias'),
          "description" = REPLACE("description", 'atividades', 'secretarias')
      WHERE "resource" = 'atividades'
    `);
    await queryRunner.query(`
      UPDATE "permissions" SET "description" = 'View secretarias' WHERE "name" = 'secretarias.read'
    `);
    await queryRunner.query(`
      UPDATE "permissions" SET "description" = 'Create secretarias & activities' WHERE "name" = 'secretarias.create'
    `);
    await queryRunner.query(`
      UPDATE "permissions" SET "description" = 'Update secretarias & activities' WHERE "name" = 'secretarias.update'
    `);
    await queryRunner.query(`
      UPDATE "permissions" SET "description" = 'Delete secretarias & activities' WHERE "name" = 'secretarias.delete'
    `);
  }
}
