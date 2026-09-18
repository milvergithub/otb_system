import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Consumption } from '../../consumption/entities/consumption.entity';
import { PaymentDiscount } from './payment-discount.entity';
import { PaymentHistory } from './payment-history.entity';

export enum PaymentStatus {
  PENDING = 'pending',
  PAID = 'paid',
  OVERDUE = 'overdue',
  PARTIAL = 'partial',
}

@Entity('payments')
export class Payment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  consumption_id: string;

  @ManyToOne(() => Consumption, (consumption) => consumption.payments)
  @JoinColumn({ name: 'consumption_id' })
  consumption: Consumption;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  total_amount: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: '0' })
  amount_paid: string;

  @Column({
    type: 'varchar',
    length: 20,
    default: PaymentStatus.PENDING,
  })
  status: PaymentStatus;

  @Column({ type: 'date' })
  due_date: string;

  @Column({ type: 'timestamp', nullable: true })
  paid_at: Date;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: '0' })
  discount_amount: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  invoice_code: string;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @OneToMany(() => PaymentHistory, (history) => history.payment)
  history: PaymentHistory[];

  @OneToMany(() => PaymentDiscount, (pd) => pd.payment)
  paymentDiscounts: PaymentDiscount[];
}
