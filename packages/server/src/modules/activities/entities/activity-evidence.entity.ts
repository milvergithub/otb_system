import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Activity } from './activity.entity';
import { User } from '../../users/entities/user.entity';

export enum EvidenceType {
  PHOTO = 'photo',
  VIDEO = 'video',
  DOCUMENT = 'document',
  PDF = 'pdf',
  OTHER = 'other',
}

@Entity('activity_evidences')
export class ActivityEvidence {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  activity_id: string;

  @ManyToOne(() => Activity, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'activity_id' })
  activity: Activity;

  @Column({ type: 'varchar', length: 20 })
  type: EvidenceType;

  @Column()
  file_key: string;

  @Column()
  file_name: string;

  @Column()
  mime_type: string;

  @Column({ type: 'bigint', nullable: true })
  size: string | null;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'uuid', nullable: true })
  uploaded_by_user_id: string | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'uploaded_by_user_id' })
  uploadedBy: User | null;

  @CreateDateColumn()
  created_at: Date;
}
