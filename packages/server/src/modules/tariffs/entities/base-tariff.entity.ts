import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { MeterTypeEntity } from '../../meters/entities/meter-type.entity';

@Entity('base_tariffs')
export class BaseTariff {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  amount: string;

  @Column({ type: 'date' })
  valid_from: string;

  @Column({ type: 'date', nullable: true })
  valid_until: string;

  @Column({ default: true })
  is_active: boolean;

  @Column({ nullable: true })
  type_id: string | null;

  @ManyToOne(() => MeterTypeEntity, { nullable: true, eager: false })
  @JoinColumn({ name: 'type_id' })
  type: MeterTypeEntity;

  @CreateDateColumn()
  created_at: Date;
}
