import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import { Activity } from './activity.entity';
import { Member } from '../../members/entities/member.entity';
import { User } from '../../users/entities/user.entity';

export enum AttendanceStatus {
  PRESENT = 'present',
  ABSENT_START = 'absent_start',
  ABSENT_END = 'absent_end',
  ABSENT_BOTH = 'absent_both',
}

export enum AttendanceResult {
  PRESENT = 'present',
  ABSENT = 'absent',
  LATE = 'late',
  LEFT_EARLY = 'left_early',
  EXCUSED = 'excused',
}

@Entity('attendances')
@Unique(['activity_id', 'member_id'])
@Index(['activity_id'])
@Index(['result'])
export class Attendance {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  activity_id: string;

  @ManyToOne(() => Activity, (a) => a.attendances, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'activity_id' })
  activity: Activity;

  @Column()
  member_id: string;

  @ManyToOne(() => Member, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'member_id' })
  member: Member;

  @Column({ type: 'boolean', default: false })
  present_at_start: boolean;

  @Column({ type: 'timestamp', nullable: true })
  checked_at_start: Date | null;

  @Column({ type: 'boolean', default: false })
  present_at_end: boolean;

  @Column({ type: 'timestamp', nullable: true })
  checked_at_end: Date | null;

  @Column({ type: 'varchar', length: 20, default: AttendanceStatus.PRESENT })
  status: AttendanceStatus;

  @Column({ type: 'varchar', length: 20, nullable: true })
  result: AttendanceResult | null;

  @Column({ type: 'timestamp', nullable: true })
  initial_marked_at: Date | null;

  @Column({ type: 'uuid', nullable: true })
  initial_marked_by_user_id: string | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'initial_marked_by_user_id' })
  initialMarkedBy: User | null;

  @Column({ type: 'timestamp', nullable: true })
  final_marked_at: Date | null;

  @Column({ type: 'uuid', nullable: true })
  final_marked_by_user_id: string | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'final_marked_by_user_id' })
  finalMarkedBy: User | null;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
