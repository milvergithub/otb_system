import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import { Activity } from './activity.entity';
import { Member } from '../../members/entities/member.entity';

export enum AttendanceStatus {
  PRESENT = 'present',
  ABSENT_START = 'absent_start',
  ABSENT_END = 'absent_end',
  ABSENT_BOTH = 'absent_both',
}

@Entity('attendances')
@Unique(['activity_id', 'member_id'])
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

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
