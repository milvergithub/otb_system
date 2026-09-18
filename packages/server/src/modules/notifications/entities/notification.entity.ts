import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Member } from '../../members/entities/member.entity';

export enum NotificationType {
  EXPIRATION = 'expiration',
  PENDING = 'pending',
  OVERDUE = 'overdue',
  PAYMENT = 'payment',
}

@Entity('notifications')
export class Notification {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  member_id: string;

  @ManyToOne(() => Member, { eager: true })
  @JoinColumn({ name: 'member_id' })
  member: Member;

  @Column({ type: 'varchar', length: 50 })
  type: NotificationType;

  @Column()
  title: string;

  @Column({ type: 'text' })
  message: string;

  @Column({ default: false })
  is_read: boolean;

  @CreateDateColumn()
  created_at: Date;
}
