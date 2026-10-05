import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateFinanceTables1755000000014 implements MigrationInterface {
  name = 'CreateFinanceTables1755000000014';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "finance_categories" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "name" character varying(80) NOT NULL,
        "type" character varying(10) NOT NULL DEFAULT 'both',
        "is_active" boolean NOT NULL DEFAULT true,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_finance_categories" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_finance_categories_name" UNIQUE ("name"),
        CONSTRAINT "CHK_finance_categories_type" CHECK ("type" IN ('income', 'expense', 'both'))
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "finance_transactions" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "type" character varying(10) NOT NULL,
        "date" date NOT NULL,
        "amount" numeric(10,2) NOT NULL,
        "concept" character varying(200) NOT NULL,
        "category_id" uuid,
        "payment_method" character varying(50),
        "reference" character varying(100),
        "member_id" uuid,
        "source_type" character varying(30),
        "source_id" character varying(100),
        "status" character varying(20) NOT NULL DEFAULT 'active',
        "user_id" uuid,
        "provider" character varying(150),
        "asset_id" uuid,
        "notes" text,
        "voided_at" TIMESTAMPTZ,
        "voided_reason" text,
        "voided_by" uuid,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_finance_transactions" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_finance_transactions_source" UNIQUE ("source_type", "source_id"),
        CONSTRAINT "CHK_finance_transactions_amount" CHECK ("amount" > 0),
        CONSTRAINT "CHK_finance_transactions_type" CHECK ("type" IN ('income', 'expense')),
        CONSTRAINT "CHK_finance_transactions_status" CHECK ("status" IN ('active', 'voided'))
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "finance_documents" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "transaction_id" uuid NOT NULL,
        "file_key" character varying(500) NOT NULL,
        "file_name" character varying(200) NOT NULL,
        "mime_type" character varying(100) NOT NULL,
        "file_size" integer,
        "kind" character varying(20) NOT NULL DEFAULT 'receipt',
        "uploaded_by" uuid,
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_finance_documents" PRIMARY KEY ("id"),
        CONSTRAINT "CHK_finance_documents_kind" CHECK ("kind" IN ('invoice', 'receipt', 'transfer', 'photo', 'other'))
      )
    `);

    await queryRunner.query(
      `CREATE INDEX "IDX_finance_categories_name" ON "finance_categories" ("name")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_finance_transactions_status" ON "finance_transactions" ("status")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_finance_transactions_type_date" ON "finance_transactions" ("type", "date")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_finance_transactions_category_id" ON "finance_transactions" ("category_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_finance_transactions_member_id" ON "finance_transactions" ("member_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_finance_transactions_asset_id" ON "finance_transactions" ("asset_id")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_finance_documents_transaction_id" ON "finance_documents" ("transaction_id")`,
    );

    await queryRunner.query(`
      ALTER TABLE "finance_transactions"
        ADD CONSTRAINT "FK_finance_transactions_category_id"
        FOREIGN KEY ("category_id") REFERENCES "finance_categories"("id")
        ON DELETE SET NULL
    `);
    await queryRunner.query(`
      ALTER TABLE "finance_transactions"
        ADD CONSTRAINT "FK_finance_transactions_member_id"
        FOREIGN KEY ("member_id") REFERENCES "members"("id")
        ON DELETE SET NULL
    `);
    await queryRunner.query(`
      ALTER TABLE "finance_transactions"
        ADD CONSTRAINT "FK_finance_transactions_user_id"
        FOREIGN KEY ("user_id") REFERENCES "users"("id")
        ON DELETE SET NULL
    `);
    await queryRunner.query(`
      ALTER TABLE "finance_transactions"
        ADD CONSTRAINT "FK_finance_transactions_asset_id"
        FOREIGN KEY ("asset_id") REFERENCES "assets"("id")
        ON DELETE SET NULL
    `);
    await queryRunner.query(`
      ALTER TABLE "finance_transactions"
        ADD CONSTRAINT "FK_finance_transactions_voided_by"
        FOREIGN KEY ("voided_by") REFERENCES "users"("id")
        ON DELETE SET NULL
    `);

    await queryRunner.query(`
      ALTER TABLE "finance_documents"
        ADD CONSTRAINT "FK_finance_documents_transaction_id"
        FOREIGN KEY ("transaction_id") REFERENCES "finance_transactions"("id")
        ON DELETE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE "finance_documents"
        ADD CONSTRAINT "FK_finance_documents_uploaded_by"
        FOREIGN KEY ("uploaded_by") REFERENCES "users"("id")
        ON DELETE SET NULL
    `);

    await queryRunner.query(`
      ALTER TABLE "asset_maintenances"
        ADD COLUMN IF NOT EXISTS "expense_transaction_id" uuid
    `);

    await queryRunner.query(`
      ALTER TABLE "asset_maintenances"
        ADD CONSTRAINT "FK_asset_maintenances_expense_transaction"
        FOREIGN KEY ("expense_transaction_id") REFERENCES "finance_transactions"("id")
        ON DELETE SET NULL
    `);

    await queryRunner.query(`
      INSERT INTO "finance_categories" ("name", "type") VALUES
        ('Cuotas OTB', 'income'),
        ('Multas', 'income'),
        ('Pagos de agua', 'income'),
        ('Acciones de agua', 'income'),
        ('Alquiler de cancha', 'income'),
        ('Donaciones', 'income'),
        ('Otros ingresos', 'income'),
        ('Servicios básicos', 'expense'),
        ('Mantenimiento', 'expense'),
        ('Materiales', 'expense'),
        ('Herramientas', 'expense'),
        ('Deportes', 'expense'),
        ('Actividades', 'expense'),
        ('Eventos', 'expense'),
        ('Limpieza', 'expense'),
        ('Transporte', 'expense'),
        ('Papelería', 'expense'),
        ('Alquileres', 'expense'),
        ('Servicios profesionales', 'expense'),
        ('Obras', 'expense'),
        ('Comisiones bancarias', 'expense'),
        ('Otros egresos', 'expense')
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `\n      ALTER TABLE "asset_maintenances" DROP CONSTRAINT "FK_asset_maintenances_expense_transaction"\n    `,
    );
    await queryRunner.query(
      `\n      ALTER TABLE "asset_maintenances" DROP COLUMN "expense_transaction_id"\n    `,
    );
    await queryRunner.query(`DROP TABLE "finance_documents"`);
    await queryRunner.query(`DROP TABLE "finance_transactions"`);
    await queryRunner.query(`DROP TABLE "finance_categories"`);
  }
}
