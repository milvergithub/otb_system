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
} from 'typeorm';
import { Attendance } from './attendance.entity';
import { Fine } from './fine.entity';
import { ActivityType } from './activity-type.entity';
import { ActivityEvidence } from './activity-evidence.entity';
import { User } from '../../users/entities/user.entity';

export enum ActivityStatus {
  DRAFT = 'draft',
  SCHEDULED = 'scheduled',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

@Entity('activities')
@Index(['created_by'])
@Index(['financial_responsible_user_id'])
@Index(['type_id'])
@Index(['status'])
@Index(['responsible_user_id'])
@Index('IDX_activities_collector_user_id', ['collector_user_id'])
export class Activity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'date' })
  date: string;

  @Column({ type: 'time' })
  start_time: string;

  @Column({ type: 'time' })
  end_time: string;

  @Column({ type: 'timestamp', nullable: true })
  initial_control_at: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  final_control_at: Date | null;

  @Column({ type: 'uuid' })
  created_by: string;

  @ManyToOne(() => User, { eager: false })
  @JoinColumn({ name: 'created_by' })
  creator: User;

  @Column({ type: 'varchar', length: 20, default: ActivityStatus.SCHEDULED })
  status: ActivityStatus;

  @Column({ type: 'uuid', nullable: true })
  type_id: string | null;

  @ManyToOne(() => ActivityType, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'type_id' })
  type: ActivityType | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  location: string | null;

  @Column({ default: true })
  attendance_required: boolean;

  @Column({ default: true })
  fine_enabled: boolean;

  /** User responsible for organizing/coordinating this activity. */
  @Column({ type: 'uuid', nullable: true })
  responsible_user_id: string | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'responsible_user_id' })
  responsibleUser: User | null;

  /**
   * User in charge of collecting this activity's fines. Fine payments snapshot
   * it into `finance_transactions.collector_user_id` and `responsible_user_id`
   * for accountability (rendición de cuentas). Optional at API level; the
   * client form defaults it to the logged-in user.
   */
  @Column({ type: 'uuid', nullable: true })
  collector_user_id: string | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'collector_user_id' })
  collectorUser: User | null;

  /**
   * @deprecated Historical column; financial responsibility for fine payments
   * now comes from `activities.collector_user_id`. Kept for backward
   * compatibility; new code must not rely on it.
   */
  @Column({ type: 'uuid', nullable: true })
  financial_responsible_user_id: string | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'financial_responsible_user_id' })
  financialResponsibleUser: User | null;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @OneToMany(() => Attendance, (a) => a.activity)
  attendances: Attendance[];

  @OneToMany(() => Fine, (f) => f.activity)
  fines: Fine[];

  @OneToMany(() => ActivityEvidence, (e) => e.activity)
  evidences: ActivityEvidence[];
}
