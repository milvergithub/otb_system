import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  Unique,
} from 'typeorm';
import { FinanceCategory } from './finance-category.entity';
import { FinanceDocument } from './finance-document.entity';
import { Member } from '../../members/entities/member.entity';
import { User } from '../../users/entities/user.entity';
import { Asset } from '../../assets/entities/asset.entity';
import { PaymentMethod } from '../../billing/entities/payment-history.entity';

export enum FinanceTransactionType {
  INCOME = 'income',
  EXPENSE = 'expense',
}

export enum FinanceTransactionStatus {
  ACTIVE = 'active',
  VOIDED = 'voided',
}

/**
 * Machine-generated sources always carry a source_id and are matched against
 * the unique (source_type, source_id) constraint, so they can never be
 * duplicated. Manual sources are free-form and allow duplicates.
 */
export enum FinanceSourceType {
  MANUAL = 'manual',
  WATER_BILL_PAYMENT = 'water_bill_payment',
  WATER_MEMBERSHIP_FEE = 'water_membership_fee',
  FINE_PAYMENT = 'fine_payment',
  ASSET_PURCHASE = 'asset_purchase',
  ASSET_MAINTENANCE = 'asset_maintenance',
  DONATION = 'donation',
  COURT_RENTAL = 'court_rental',
  OTHER = 'other',
}

export const MACHINE_SOURCE_TYPES: FinanceSourceType[] = [
  FinanceSourceType.WATER_BILL_PAYMENT,
  FinanceSourceType.WATER_MEMBERSHIP_FEE,
  FinanceSourceType.FINE_PAYMENT,
  FinanceSourceType.ASSET_PURCHASE,
  FinanceSourceType.ASSET_MAINTENANCE,
];

@Entity('finance_transactions')
@Index(['type', 'date'])
@Index(['status'])
@Index(['category_id'])
@Index(['member_id'])
@Index(['asset_id'])
@Unique(['source_type', 'source_id'])
export class FinanceTransaction {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 10 })
  type: FinanceTransactionType;

  @Column({ type: 'date' })
  date: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  amount: string;

  @Column({ type: 'varchar', length: 200 })
  concept: string;

  @Column({ type: 'uuid', nullable: true })
  category_id: string | null;

  @ManyToOne(() => FinanceCategory, (category) => category.transactions, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'category_id' })
  category: FinanceCategory | null;

  @Column({ type: 'varchar', length: 50, nullable: true })
  payment_method: PaymentMethod | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  reference: string | null;

  @Column({ type: 'uuid', nullable: true })
  member_id: string | null;

  @ManyToOne(() => Member, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'member_id' })
  member: Member | null;

  @Column({ type: 'varchar', length: 30, nullable: true })
  source_type: FinanceSourceType | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  source_id: string | null;

  @Column({
    type: 'varchar',
    length: 20,
    default: FinanceTransactionStatus.ACTIVE,
  })
  status: FinanceTransactionStatus;

  @Column({ type: 'uuid', nullable: true })
  user_id: string | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'user_id' })
  user: User | null;

  @Column({ type: 'varchar', length: 150, nullable: true })
  provider: string | null;

  @Column({ type: 'uuid', nullable: true })
  asset_id: string | null;

  @ManyToOne(() => Asset, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'asset_id' })
  asset: Asset | null;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @Column({ type: 'timestamp', nullable: true })
  voided_at: Date | null;

  @Column({ type: 'text', nullable: true })
  voided_reason: string | null;

  @Column({ type: 'uuid', nullable: true })
  voided_by: string | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'voided_by' })
  voidedBy: User | null;

  @OneToMany(() => FinanceDocument, (document) => document.transaction)
  documents: FinanceDocument[];

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
