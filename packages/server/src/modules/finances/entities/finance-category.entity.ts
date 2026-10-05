import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { FinanceTransaction } from './finance-transaction.entity';

export enum FinanceCategoryType {
  INCOME = 'income',
  EXPENSE = 'expense',
  BOTH = 'both',
}

@Entity('finance_categories')
export class FinanceCategory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 80, unique: true })
  name: string;

  @Column({ type: 'varchar', length: 10, default: FinanceCategoryType.BOTH })
  type: FinanceCategoryType;

  @Column({ default: true })
  is_active: boolean;

  @OneToMany(() => FinanceTransaction, (transaction) => transaction.category)
  transactions: FinanceTransaction[];

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
