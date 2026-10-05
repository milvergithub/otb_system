import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { FinanceTransaction } from './finance-transaction.entity';
import { User } from '../../users/entities/user.entity';

export enum FinanceDocumentKind {
  INVOICE = 'invoice',
  RECEIPT = 'receipt',
  TRANSFER = 'transfer',
  PHOTO = 'photo',
  OTHER = 'other',
}

@Entity('finance_documents')
@Index(['transaction_id'])
export class FinanceDocument {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  transaction_id: string;

  @ManyToOne(() => FinanceTransaction, (transaction) => transaction.documents, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'transaction_id' })
  transaction: FinanceTransaction;

  @Column({ type: 'varchar', length: 500 })
  file_key: string;

  @Column({ type: 'varchar', length: 200 })
  file_name: string;

  @Column({ type: 'varchar', length: 100 })
  mime_type: string;

  @Column({ type: 'integer', nullable: true })
  file_size: number | null;

  @Column({
    type: 'varchar',
    length: 20,
    default: FinanceDocumentKind.RECEIPT,
  })
  kind: FinanceDocumentKind;

  @Column({ type: 'uuid', nullable: true })
  uploaded_by: string | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'uploaded_by' })
  uploadedBy: User | null;

  @CreateDateColumn()
  created_at: Date;
}
