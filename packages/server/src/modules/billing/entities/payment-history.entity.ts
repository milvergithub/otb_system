import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Payment } from './payment.entity';

export enum PaymentMethod {
  CASH = 'cash',
  TRANSFER = 'transfer',
  CARD = 'card',
  QR = 'qr',
  OTHER = 'other',
}

@Entity('payment_history')
export class PaymentHistory {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  payment_id: string;

  @ManyToOne(() => Payment, (payment) => payment.history)
  @JoinColumn({ name: 'payment_id' })
  payment: Payment;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  amount: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  payment_method: PaymentMethod;

  @Column({ nullable: true })
  reference: string;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  evidence_key: string;

  @CreateDateColumn()
  created_at: Date;
}
