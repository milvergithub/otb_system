import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Asset } from './asset.entity';
import { FinanceTransaction } from '../../finances/entities/finance-transaction.entity';

@Entity('asset_maintenances')
@Index(['asset_id', 'started_at'])
export class AssetMaintenance {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  asset_id: string;

  @ManyToOne(() => Asset, (asset) => asset.maintenances, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'asset_id' })
  asset: Asset;

  @Column({ type: 'varchar', length: 200 })
  reason: string;

  @Column({ type: 'date' })
  started_at: string;

  @Column({ type: 'date', nullable: true })
  finished_at: string | null;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  cost: string | null;

  @Column({ type: 'varchar', length: 150, nullable: true })
  provider: string | null;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @Column({ type: 'uuid', nullable: true })
  created_by: string | null;

  /** FK to finance_transactions set when the maintenance is expensed (Phase 8). */
  @Column({ type: 'uuid', nullable: true })
  expense_transaction_id: string | null;

  @ManyToOne(() => FinanceTransaction, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'expense_transaction_id' })
  expenseTransaction: FinanceTransaction | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'created_by' })
  createdBy: User | null;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
