import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Payment } from './payment.entity';
import { Surcharge } from './surcharge.entity';

@Entity('payment_surcharges')
export class PaymentSurcharge {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  payment_id: string;

  @ManyToOne(() => Payment, (payment) => payment.paymentSurcharges, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'payment_id' })
  payment: Payment;

  @Column()
  surcharge_id: string;

  @ManyToOne(() => Surcharge, { eager: true })
  @JoinColumn({ name: 'surcharge_id' })
  surcharge: Surcharge;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  amount: string;

  @CreateDateColumn()
  created_at: Date;
}
