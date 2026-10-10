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
import { Member } from '../../members/entities/member.entity';
import { User } from '../../users/entities/user.entity';
import { Contribution } from './contribution.entity';

export enum ContributionObligationStatus {
  PENDING = 'pending',
  PARTIAL = 'partial',
  PAID = 'paid',
  EXONERATED = 'exonerated',
  CANCELLED = 'cancelled',
}

@Entity('contribution_obligations')
@Unique('UQ_contribution_obligations_contribution_member', [
  'contribution_id',
  'member_id',
])
@Index('IDX_contribution_obligations_contribution_status', [
  'contribution_id',
  'status',
])
@Index('IDX_contribution_obligations_member_id', ['member_id'])
export class ContributionObligation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  contribution_id: string;

  @ManyToOne(() => Contribution, (c) => c.obligations, {
    nullable: false,
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'contribution_id' })
  contribution: Contribution;

  /**
   * RESTRICT: a member with historical obligations can never be deleted
   * physically, so the campaign history stays intact.
   */
  @Column({ type: 'uuid' })
  member_id: string;

  @ManyToOne(() => Member, { nullable: false, onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'member_id' })
  member: Member;

  /** Amount frozen at inclusion time (snapshot of amount_per_member). */
  @Column({ type: 'decimal', precision: 10, scale: 2 })
  amount: string;

  @Column({
    type: 'varchar',
    length: 20,
    default: ContributionObligationStatus.PENDING,
  })
  status: ContributionObligationStatus;

  @Column({ type: 'text', nullable: true })
  exonerated_reason: string | null;

  @Column({ type: 'uuid', nullable: true })
  exonerated_by: string | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'exonerated_by' })
  exoneratedBy: User | null;

  @Column({ type: 'timestamp', nullable: true })
  exonerated_at: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  paid_at: Date | null;

  @Column({ type: 'text', nullable: true })
  cancel_reason: string | null;

  @Column({ type: 'uuid', nullable: true })
  created_by: string | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'created_by' })
  createdBy: User | null;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
