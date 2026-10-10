import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Member } from '../../members/entities/member.entity';
import { User } from '../../users/entities/user.entity';
import { Contribution } from './contribution.entity';
import { ContributionObligation } from './contribution-obligation.entity';

export enum ContributionPaymentStatus {
  ACTIVE = 'active',
  VOIDED = 'voided',
}

@Entity('contribution_payments')
@Index('IDX_contribution_payments_contribution_status', [
  'contribution_id',
  'status',
])
@Index('IDX_contribution_payments_obligation_status', [
  'obligation_id',
  'status',
])
@Index('IDX_contribution_payments_member_id', ['member_id'])
export class ContributionPayment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  obligation_id: string;

  @ManyToOne(() => ContributionObligation, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'obligation_id' })
  obligation: ContributionObligation;

  @Column({ type: 'uuid' })
  contribution_id: string;

  @ManyToOne(() => Contribution, (c) => c.payments, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'contribution_id' })
  contribution: Contribution;

  @Column({ type: 'uuid', nullable: true })
  member_id: string | null;

  @ManyToOne(() => Member, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'member_id' })
  member: Member | null;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  amount: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  payment_method: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  reference: string | null;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  /** Object key only (S3/RustFS); the URL is derived through StorageService. */
  @Column({ type: 'varchar', length: 500, nullable: true })
  evidence_key: string | null;

  /** Collector snapshot at payment time. */
  @Column({ type: 'uuid', nullable: true })
  collector_user_id: string | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'collector_user_id' })
  collectorUser: User | null;

  /** Authenticated user that registered the payment (never client-supplied). */
  @Column({ type: 'uuid', nullable: true })
  registered_by_user_id: string | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'registered_by_user_id' })
  registeredByUser: User | null;

  @Column({ type: 'date' })
  paid_at: string;

  @Column({
    type: 'varchar',
    length: 20,
    default: ContributionPaymentStatus.ACTIVE,
  })
  status: ContributionPaymentStatus;

  @Column({ type: 'timestamp', nullable: true })
  voided_at: Date | null;

  @Column({ type: 'text', nullable: true })
  voided_reason: string | null;

  @Column({ type: 'uuid', nullable: true })
  voided_by: string | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'voided_by' })
  voidedBy: User | null;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
