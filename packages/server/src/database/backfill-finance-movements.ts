import 'reflect-metadata';
import * as fs from 'fs';
import * as dotenv from 'dotenv';
import { NestFactory } from '@nestjs/core';
import { DataSource, EntityManager } from 'typeorm';
import { AppModule } from '../app.module';
import { FinancesService } from '../modules/finances/finances.service';
import { FinanceSourceType } from '../modules/finances/entities/finance-transaction.entity';
import { RecordFinanceMovementInput } from '../modules/finances/finances.service';

const envFile = process.env.ENV_FILE || '.env';
if (fs.existsSync(envFile)) {
  dotenv.config({ path: envFile });
  console.log(`Loaded env from ${envFile}`);
}

const APPLY = process.argv.includes('--apply');

interface Candidate {
  sourceId: string;
  amount: number;
  concept: string;
  date: string;
  memberId: string | null;
  paymentMethod?: string | null;
  reference?: string | null;
  notes?: string | null;
  extra?: Record<string, unknown>;
}

function isoDate(value: unknown): string {
  if (!value) return new Date().toISOString().split('T')[0];
  if (typeof value === 'string') return value.split('T')[0];
  return (value as Date).toISOString().split('T')[0];
}

async function main() {
  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn'],
  });
  const dataSource = app.get(DataSource);
  const finances = app.get(FinancesService, { strict: false });

  const build = async (): Promise<
    Record<string, { rows: Candidate[]; total: number }>
  > => {
    const water = await dataSource.query(
      `
      SELECT h.id::text, h.amount::text, h.payment_method, h.reference, h.notes,
             h.created_at, c.year, c.month, m.member_id::text
      FROM payment_history h
      JOIN payments p ON p.id = h.payment_id
      LEFT JOIN consumptions c ON c.id = p.consumption_id
      LEFT JOIN meters m ON m.id = c.meter_id
      WHERE NOT EXISTS (
        SELECT 1 FROM finance_transactions t
        WHERE t.source_type = $1 AND t.source_id::text = h.id::text
      )
    `,
      [FinanceSourceType.WATER_BILL_PAYMENT],
    );

    const shares = await dataSource.query(
      `
      SELECT s.id::text, s.amount::text, s.payment_method, s.reference, s.notes,
             s.paid_at, m.member_id::text, sh.name AS share_name
      FROM share_payments s
      LEFT JOIN meters m ON m.id = s.meter_id
      LEFT JOIN water_shares sh ON sh.id = s.share_id
      WHERE s.paid_at IS NOT NULL
        AND NOT EXISTS (
          SELECT 1 FROM finance_transactions t
          WHERE t.source_type = $1 AND t.source_id::text = s.id::text
        )
    `,
      [FinanceSourceType.WATER_MEMBERSHIP_FEE],
    );

    const fines = await dataSource.query(
      `
      SELECT f.id::text, f.amount::text, f.notes, f.paid_at,
             f.member_id::text, ft.name AS fine_type, a.name AS activity
      FROM fines f
      LEFT JOIN fine_types ft ON ft.id = f.fine_type_id
      LEFT JOIN activities a ON a.id = f.activity_id
      WHERE f.status = 'paid'
        AND NOT EXISTS (
          SELECT 1 FROM finance_transactions t
          WHERE t.source_type = $1 AND t.source_id::text = f.id::text
        )
    `,
      [FinanceSourceType.FINE_PAYMENT],
    );

    const toNumber = (v: string) => parseFloat(v);
    const sum = (rows: Candidate[]) =>
      rows.reduce(
        (acc, r) => acc + (Number.isFinite(r.amount) ? r.amount : 0),
        0,
      );

    const waterRows: Candidate[] = water.map((r: any) => ({
      sourceId: r.id,
      amount: toNumber(r.amount),
      concept:
        `Pago de boleta de agua ${r.year ?? ''}-${String(r.month ?? '').padStart(2, '0')}`.trim(),
      date: isoDate(r.created_at),
      memberId: r.member_id ?? null,
      paymentMethod: r.payment_method,
      reference: r.reference,
      notes: r.notes,
    }));

    const shareRows: Candidate[] = shares.map((r: any) => ({
      sourceId: r.id,
      amount: toNumber(r.amount),
      concept: `Acción de agua${r.share_name ? ` - ${r.share_name}` : ''}`,
      date: isoDate(r.paid_at),
      memberId: r.member_id ?? null,
      paymentMethod: r.payment_method,
      reference: r.reference,
      notes: r.notes,
    }));

    const fineRows: Candidate[] = fines.map((r: any) => ({
      sourceId: r.id,
      amount: toNumber(r.amount),
      concept: `Multa${r.fine_type ? ` - ${r.fine_type}` : ''}${
        r.activity ? ` (${r.activity})` : ''
      }`,
      date: isoDate(r.paid_at),
      memberId: r.member_id ?? null,
      notes: r.notes,
    }));

    return {
      [FinanceSourceType.WATER_BILL_PAYMENT]: {
        rows: waterRows,
        total: sum(waterRows),
      },
      [FinanceSourceType.WATER_MEMBERSHIP_FEE]: {
        rows: shareRows,
        total: sum(shareRows),
      },
      [FinanceSourceType.FINE_PAYMENT]: {
        rows: fineRows,
        total: sum(fineRows),
      },
    };
  };

  const plan = await build();
  const grandRows = Object.values(plan).reduce((a, b) => a + b.rows.length, 0);
  const grandTotal = Object.values(plan).reduce((a, b) => a + b.total, 0);

  console.log(
    `\n=== Backfill de movimientos financieros (${APPLY ? 'APLICANDO' : 'SIMULACION'}) ===\n`,
  );
  for (const [source, { rows, total }] of Object.entries(plan)) {
    console.log(
      `  ${source.padEnd(24)} ${String(rows.length).padStart(4)} movimientos  ${total.toFixed(2)}`,
    );
    if (!APPLY) {
      for (const r of rows.slice(0, 3)) {
        console.log(
          `      - ${r.date}  ${r.amount.toFixed(2).padStart(9)}  ${r.concept}`,
        );
      }
      if (rows.length > 3) console.log(`      ... y ${rows.length - 3} mas`);
    }
  }
  console.log(
    `\n  TOTAL: ${grandRows} movimientos por ${grandTotal.toFixed(2)}\n`,
  );

  if (!APPLY) {
    console.log(
      'Modo simulacion: no se escribio nada. ReEjecute con --apply para aplicar.\n',
    );
    await app.close();
    return;
  }

  if (grandRows === 0) {
    console.log('Nada que hacer: todos los movimientos ya tienen asiento.\n');
    await app.close();
    return;
  }

  let inserted = 0;
  let skipped = 0;

  await dataSource.transaction(async (manager: EntityManager) => {
    for (const [source, { rows }] of Object.entries(plan)) {
      for (const r of rows) {
        if (!Number.isFinite(r.amount) || r.amount <= 0) {
          skipped++;
          console.warn(
            `  OMITIDO ${source}/${r.sourceId}: monto invalido ${r.amount}`,
          );
          continue;
        }
        const input: RecordFinanceMovementInput = {
          sourceType: source as FinanceSourceType,
          sourceId: r.sourceId,
          amount: r.amount,
          concept: r.concept,
          date: r.date,
          memberId: r.memberId,
          paymentMethod: (r.paymentMethod as never) ?? undefined,
          reference: r.reference ?? undefined,
          notes: r.notes ?? undefined,
        };
        try {
          await finances.validateMovement(input, manager);
          const tx = await finances.recordIncome(input, undefined, manager);
          if (tx) inserted++;
          else skipped++;
        } catch (error) {
          skipped++;
          console.error(
            `  ERROR ${source}/${r.sourceId}: ${(error as Error).message}`,
          );
        }
      }
    }
  });

  console.log(`\n  Insertados: ${inserted} | Omitidos: ${skipped}\n`);
  await app.close();
}

main().catch((error) => {
  console.error('Backfill fallo:', error);
  process.exit(1);
});
