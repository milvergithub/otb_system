import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Member } from '../../members/entities/member.entity';
import { User } from '../../users/entities/user.entity';
import { Asset } from './asset.entity';
import { AssetLocation } from './asset-location.entity';

/**
 * Custody / lifecycle history of an asset.
 * A loan is a single row: `returned_at` stays NULL while it is open, so both
 * the outgoing and the incoming date live on the same record.
 */
export enum AssetMovementType {
  LOAN = 'loan',
  TRANSFER = 'transfer',
  LOST = 'lost',
  RETIREMENT = 'retirement',
  RESTORE = 'restore',
}

@Entity('asset_movements')
@Index(['asset_id', 'moved_at'])
export class AssetMovement {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  asset_id: string;

  @ManyToOne(() => Asset, (asset) => asset.movements, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'asset_id' })
  asset: Asset;

  @Column({ type: 'varchar', length: 20 })
  type: AssetMovementType;

  @Column({ type: 'uuid', nullable: true })
  from_location_id: string | null;

  @ManyToOne(() => AssetLocation, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'from_location_id' })
  fromLocation: AssetLocation | null;

  @Column({ type: 'uuid', nullable: true })
  to_location_id: string | null;

  @ManyToOne(() => AssetLocation, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'to_location_id' })
  toLocation: AssetLocation | null;

  @Column({ type: 'uuid', nullable: true })
  responsible_user_id: string | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'responsible_user_id' })
  responsibleUser: User | null;

  @Column({ type: 'uuid', nullable: true })
  responsible_member_id: string | null;

  @ManyToOne(() => Member, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'responsible_member_id' })
  responsibleMember: Member | null;

  @Column({ type: 'varchar', length: 200, nullable: true })
  motive: string | null;

  @Column({ type: 'date' })
  moved_at: string;

  @Column({ type: 'date', nullable: true })
  returned_at: string | null;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @Column({ type: 'uuid', nullable: true })
  created_by: string | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'created_by' })
  createdBy: User | null;

  @CreateDateColumn()
  created_at: Date;
}
