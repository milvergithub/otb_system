import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
} from 'typeorm';
import { Activity } from './activity.entity';
import { User } from '../../users/entities/user.entity';

@Entity('activity_shares')
@Unique(['activity_id', 'user_id'])
export class ActivityShare {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  activity_id: string;

  @ManyToOne(() => Activity, (a) => a.shares, { onDelete: 'CASCADE' })
  activity: Activity;

  @Column({ type: 'uuid' })
  user_id: string;

  @ManyToOne(() => User, { eager: true })
  user: User;

  @Column({ type: 'varchar', length: 20, default: 'viewer' })
  permission: string;

  @CreateDateColumn()
  created_at: Date;
}
