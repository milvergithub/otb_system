import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Meter } from '../../meters/entities/meter.entity';
import { PaymentMethod } from '../../billing/entities/payment-history.entity';
import { WaterShare } from './water-share.entity';

@Entity('share_payments')
export class SharePayment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  meter_id: string;

  @ManyToOne(() => Meter, (meter) => meter.sharePayments)
  @JoinColumn({ name: 'meter_id' })
  meter: Meter;

  @Column({ nullable: true })
  share_id: string;

  @ManyToOne(() => WaterShare, { nullable: true })
  @JoinColumn({ name: 'share_id' })
  share: WaterShare;

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

  @Column({ type: 'date' })
  paid_at: string;

  @CreateDateColumn()
  created_at: Date;
}
