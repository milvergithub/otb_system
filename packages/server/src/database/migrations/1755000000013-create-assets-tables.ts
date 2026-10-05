import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateAssetsTables1755000000013 implements MigrationInterface {
  name = 'CreateAssetsTables1755000000013';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "asset_categories" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "name" character varying(80) NOT NULL,
        "description" text,
        "is_active" boolean NOT NULL DEFAULT true,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_asset_categories" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_asset_categories_name" UNIQUE ("name")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "asset_locations" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "name" character varying(100) NOT NULL,
        "description" text,
        "is_active" boolean NOT NULL DEFAULT true,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_asset_locations" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_asset_locations_name" UNIQUE ("name")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "assets" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "code" character varying(30) NOT NULL,
        "name" character varying(150) NOT NULL,
        "description" text,
        "category_id" uuid,
        "location_id" uuid,
        "status" character varying(20) NOT NULL DEFAULT 'active',
        "condition" character varying(20) NOT NULL DEFAULT 'good',
        "quantity" integer NOT NULL DEFAULT 1,
        "acquisition_date" date,
        "acquisition_value" numeric(10,2),
        "acquisition_type" character varying(30),
        "current_responsible_user_id" uuid,
        "current_responsible_member_id" uuid,
        "notes" text,
        "retired_at" date,
        "retirement_reason" text,
        "retirement_responsible_user_id" uuid,
        "retirement_document_key" character varying(500),
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_assets" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_assets_code" UNIQUE ("code"),
        CONSTRAINT "CHK_assets_quantity" CHECK ("quantity" >= 1),
        CONSTRAINT "CHK_assets_single_responsible" CHECK (
          num_nonnulls("current_responsible_user_id", "current_responsible_member_id") <= 1
        )
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "asset_movements" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "asset_id" uuid NOT NULL,
        "type" character varying(20) NOT NULL,
        "from_location_id" uuid,
        "to_location_id" uuid,
        "responsible_user_id" uuid,
        "responsible_member_id" uuid,
        "motive" character varying(200),
        "moved_at" date NOT NULL,
        "returned_at" date,
        "notes" text,
        "created_by" uuid,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_asset_movements" PRIMARY KEY ("id"),
        CONSTRAINT "CHK_asset_movements_single_responsible" CHECK (
          num_nonnulls("responsible_user_id", "responsible_member_id") <= 1
        )
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "asset_maintenances" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "asset_id" uuid NOT NULL,
        "reason" character varying(200) NOT NULL,
        "started_at" date NOT NULL,
        "finished_at" date,
        "cost" numeric(10,2),
        "provider" character varying(150),
        "notes" text,
        "created_by" uuid,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_asset_maintenances" PRIMARY KEY ("id"),
        CONSTRAINT "CHK_asset_maintenances_period" CHECK (
          "finished_at" IS NULL OR "finished_at" >= "started_at"
        )
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "asset_documents" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "asset_id" uuid NOT NULL,
        "file_key" character varying(500) NOT NULL,
        "file_name" character varying(200) NOT NULL,
        "mime_type" character varying(100) NOT NULL,
        "file_size" integer,
        "kind" character varying(20) NOT NULL DEFAULT 'photo',
        "uploaded_by" uuid,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_asset_documents" PRIMARY KEY ("id")
      )
    `);

    await queryRunner.query(
      `CREATE INDEX "IDX_assets_status" ON "assets" ("status")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_assets_category_id" ON "assets" ("category_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_assets_location_id" ON "assets" ("location_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_assets_current_responsible_member_id" ON "assets" ("current_responsible_member_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_asset_movements_asset_id_moved_at" ON "asset_movements" ("asset_id", "moved_at")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_asset_maintenances_asset_id_started_at" ON "asset_maintenances" ("asset_id", "started_at")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_asset_documents_asset_id" ON "asset_documents" ("asset_id")`,
    );

    await queryRunner.query(`
      ALTER TABLE "assets"
        ADD CONSTRAINT "FK_assets_category_id"
        FOREIGN KEY ("category_id") REFERENCES "asset_categories"("id")
        ON DELETE SET NULL
    `);
    await queryRunner.query(`
      ALTER TABLE "assets"
        ADD CONSTRAINT "FK_assets_location_id"
        FOREIGN KEY ("location_id") REFERENCES "asset_locations"("id")
        ON DELETE SET NULL
    `);
    await queryRunner.query(`
      ALTER TABLE "assets"
        ADD CONSTRAINT "FK_assets_current_responsible_user_id"
        FOREIGN KEY ("current_responsible_user_id") REFERENCES "users"("id")
        ON DELETE SET NULL
    `);
    await queryRunner.query(`
      ALTER TABLE "assets"
        ADD CONSTRAINT "FK_assets_current_responsible_member_id"
        FOREIGN KEY ("current_responsible_member_id") REFERENCES "members"("id")
        ON DELETE SET NULL
    `);
    await queryRunner.query(`
      ALTER TABLE "assets"
        ADD CONSTRAINT "FK_assets_retirement_responsible_user_id"
        FOREIGN KEY ("retirement_responsible_user_id") REFERENCES "users"("id")
        ON DELETE SET NULL
    `);

    await queryRunner.query(`
      ALTER TABLE "asset_movements"
        ADD CONSTRAINT "FK_asset_movements_asset_id"
        FOREIGN KEY ("asset_id") REFERENCES "assets"("id")
        ON DELETE CASCADE
    `);
    await queryRunner.query(`
      ALTER TABLE "asset_movements"
        ADD CONSTRAINT "FK_asset_movements_from_location_id"
        FOREIGN KEY ("from_location_id") REFERENCES "asset_locations"("id")
        ON DELETE SET NULL
    `);
    await queryRunner.query(`
      ALTER TABLE "asset_movements"
        ADD CONSTRAINT "FK_asset_movements_to_location_id"
        FOREIGN KEY ("to_location_id") REFERENCES "asset_locations"("id")
        ON DELETE SET NULL
    `);
    await queryRunner.query(`
      ALTER TABLE "asset_movements"
        ADD CONSTRAINT "FK_asset_movements_responsible_user_id"
        FOREIGN KEY ("responsible_user_id") REFERENCES "users"("id")
        ON DELETE SET NULL
    `);
    await queryRunner.query(`
      ALTER TABLE "asset_movements"
        ADD CONSTRAINT "FK_asset_movements_responsible_member_id"
        FOREIGN KEY ("responsible_member_id") REFERENCES "members"("id")
        ON DELETE SET NULL
    `);
    await queryRunner.query(`
      ALTER TABLE "asset_movements"
        ADD CONSTRAINT "FK_asset_movements_created_by"
        FOREIGN KEY ("created_by") REFERENCES "users"("id")
        ON DELETE SET NULL
    `);

    await queryRunner.query(`
      ALTER TABLE "asset_maintenances"
        ADD CONSTRAINT "FK_asset_maintenances_asset_id"
        FOREIGN KEY ("asset_id") REFERENCES "assets"("id")
        ON DELETE CASCADE
    `);
    await queryRunner.query(`
      ALTER TABLE "asset_maintenances"
        ADD CONSTRAINT "FK_asset_maintenances_created_by"
        FOREIGN KEY ("created_by") REFERENCES "users"("id")
        ON DELETE SET NULL
    `);

    await queryRunner.query(`
      ALTER TABLE "asset_documents"
        ADD CONSTRAINT "FK_asset_documents_asset_id"
        FOREIGN KEY ("asset_id") REFERENCES "assets"("id")
        ON DELETE CASCADE
    `);
    await queryRunner.query(`
      ALTER TABLE "asset_documents"
        ADD CONSTRAINT "FK_asset_documents_uploaded_by"
        FOREIGN KEY ("uploaded_by") REFERENCES "users"("id")
        ON DELETE SET NULL
    `);

    await queryRunner.query(`
      INSERT INTO "asset_categories" ("name") VALUES
        ('Deportivo'),
        ('Herramientas'),
        ('Mobiliario'),
        ('Electrónica'),
        ('Limpieza'),
        ('Eventos'),
        ('Infraestructura'),
        ('Otros')
    `);

    await queryRunner.query(`
      INSERT INTO "asset_locations" ("name") VALUES
        ('Sede OTB'),
        ('Cancha'),
        ('Almacén'),
        ('Oficina'),
        ('Casa del presidente'),
        ('Casa del secretario'),
        ('En poder de un socio'),
        ('Otros')
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "asset_documents"`);
    await queryRunner.query(`DROP TABLE "asset_maintenances"`);
    await queryRunner.query(`DROP TABLE "asset_movements"`);
    await queryRunner.query(`DROP TABLE "assets"`);
    await queryRunner.query(`DROP TABLE "asset_locations"`);
    await queryRunner.query(`DROP TABLE "asset_categories"`);
  }
}
