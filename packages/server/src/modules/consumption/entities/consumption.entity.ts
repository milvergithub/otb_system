import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { Meter } from '../../meters/entities/meter.entity';
import { Payment } from '../../billing/entities/payment.entity';

@Entity('consumptions')
@Unique(['meter_id', 'month', 'year'])
export class Consumption {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  meter_id: string;

  @ManyToOne(() => Meter, (meter) => meter.consumptions)
  @JoinColumn({ name: 'meter_id' })
  meter: Meter;

  @Column({ type: 'int' })
  month: number;

  @Column({ type: 'int' })
  year: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  current_reading: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  previous_reading: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  cubic_meters: string;

  @Column({ type: 'text', nullable: true })
  image_key: string;

  @CreateDateColumn()
  created_at: Date;

  @OneToMany(() => Payment, (payment) => payment.consumption)
  payments: Payment[];
}
