import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Attendance } from './attendance.entity';
import { Fine } from './fine.entity';
import { ActivityShare } from './activity-share.entity';
import { User } from '../../users/entities/user.entity';

@Entity('activities')
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
  creator: User;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @OneToMany(() => Attendance, (a) => a.activity)
  attendances: Attendance[];

  @OneToMany(() => Fine, (f) => f.activity)
  fines: Fine[];

  @OneToMany(() => ActivityShare, (s) => s.activity)
  shares: ActivityShare[];
}
