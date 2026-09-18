import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Member } from '../../members/entities/member.entity';
import { Activity } from './activity.entity';
import { FineType } from './fine-type.entity';

export enum FineStatus {
  PENDING = 'pending',
  PAID = 'paid',
  CANCELLED = 'cancelled',
}

@Entity('fines')
export class Fine {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  member_id: string;

  @ManyToOne(() => Member, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'member_id' })
  member: Member;

  @Column()
  activity_id: string;

  @ManyToOne(() => Activity, (a) => a.fines, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'activity_id' })
  activity: Activity;

  @Column()
  fine_type_id: string;

  @ManyToOne(() => FineType, { eager: true })
  @JoinColumn({ name: 'fine_type_id' })
  fineType: FineType;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  amount: string;

  @Column({ type: 'varchar', length: 20, default: FineStatus.PENDING })
  status: FineStatus;

  @Column({ type: 'timestamp', nullable: true })
  paid_at: Date;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
