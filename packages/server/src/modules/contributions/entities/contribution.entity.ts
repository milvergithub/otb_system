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
import { User } from '../../users/entities/user.entity';
import { ContributionObligation } from './contribution-obligation.entity';
import { ContributionPayment } from './contribution-payment.entity';

export enum ContributionStatus {
  DRAFT = 'draft',
  ACTIVE = 'active',
  PAUSED = 'paused',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

@Entity('contributions')
@Index('IDX_contributions_status', ['status'])
@Index('IDX_contributions_collector_user_id', ['collector_user_id'])
@Index('IDX_contributions_responsible_user_id', ['responsible_user_id'])
@Index('IDX_contributions_created_by', ['created_by'])
export class Contribution {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 200 })
  title: string;

  @Column({ type: 'text', nullable: true })
  purpose: string | null;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  amount_per_member: string;

  @Column({
    type: 'varchar',
    length: 20,
    default: ContributionStatus.DRAFT,
  })
  status: ContributionStatus;

  /** User in charge of collecting this campaign's payments (snapshot source). */
  @Column({ type: 'uuid', nullable: true })
  collector_user_id: string | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'collector_user_id' })
  collectorUser: User | null;

  /** User accountable for the rendición de cuentas of this campaign. */
  @Column({ type: 'uuid', nullable: true })
  responsible_user_id: string | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'responsible_user_id' })
  responsibleUser: User | null;

  @Column({ type: 'uuid' })
  created_by: string;

  @ManyToOne(() => User, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'created_by' })
  creator: User;

  @Column({ type: 'timestamp', nullable: true })
  activated_at: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  completed_at: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  cancelled_at: Date | null;

  @Column({ type: 'text', nullable: true })
  cancel_reason: string | null;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @OneToMany(() => ContributionObligation, (o) => o.contribution)
  obligations: ContributionObligation[];

  @OneToMany(() => ContributionPayment, (p) => p.contribution)
  payments: ContributionPayment[];
}
