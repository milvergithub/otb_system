import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Discount } from './discount.entity';
import { Payment } from './payment.entity';

@Entity('payment_discounts')
export class PaymentDiscount {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  payment_id: string;

  @ManyToOne(() => Payment, (payment) => payment.paymentDiscounts, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'payment_id' })
  payment: Payment;

  @Column()
  discount_id: string;

  @ManyToOne(() => Discount, { eager: true })
  @JoinColumn({ name: 'discount_id' })
  discount: Discount;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  amount: string;

  @CreateDateColumn()
  created_at: Date;
}
