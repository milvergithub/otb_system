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
import { Member } from '../../members/entities/member.entity';
import { User } from '../../users/entities/user.entity';
import { AssetCategory } from './asset-category.entity';
import { AssetDocument } from './asset-document.entity';
import { AssetLocation } from './asset-location.entity';
import { AssetMaintenance } from './asset-maintenance.entity';
import { AssetMovement } from './asset-movement.entity';

/** Administrative lifecycle of the asset. Never mixed with `condition`. */
export enum AssetStatus {
  ACTIVE = 'active',
  LOANED = 'loaned',
  IN_MAINTENANCE = 'in_maintenance',
  LOST = 'lost',
  RETIRED = 'retired',
}

/** Physical condition of the asset. Never mixed with `status`. */
export enum AssetCondition {
  NEW = 'new',
  GOOD = 'good',
  FAIR = 'fair',
  POOR = 'poor',
}

export enum AssetAcquisitionType {
  PURCHASE = 'purchase',
  DONATION = 'donation',
  TRANSFER = 'transfer',
  CONSTRUCTION = 'construction',
}

@Entity('assets')
@Index(['status'])
@Index(['category_id'])
@Index(['location_id'])
@Index(['current_responsible_member_id'])
export class Asset {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 30, unique: true })
  code: string;

  @Column({ type: 'varchar', length: 150 })
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string | null;

  @Column({ type: 'uuid', nullable: true })
  category_id: string | null;

  @ManyToOne(() => AssetCategory, (category) => category.assets, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'category_id' })
  category: AssetCategory | null;

  @Column({ type: 'uuid', nullable: true })
  location_id: string | null;

  @ManyToOne(() => AssetLocation, (location) => location.assets, {
    nullable: true,
    onDelete: 'SET NULL',
  })
  @JoinColumn({ name: 'location_id' })
  location: AssetLocation | null;

  @Column({ type: 'varchar', length: 20, default: AssetStatus.ACTIVE })
  status: AssetStatus;

  @Column({ type: 'varchar', length: 20, default: AssetCondition.GOOD })
  condition: AssetCondition;

  @Column({ type: 'integer', default: 1 })
  quantity: number;

  @Column({ type: 'date', nullable: true })
  acquisition_date: string | null;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  acquisition_value: string | null;

  @Column({ type: 'varchar', length: 30, nullable: true })
  acquisition_type: AssetAcquisitionType | null;

  @Column({ type: 'uuid', nullable: true })
  current_responsible_user_id: string | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'current_responsible_user_id' })
  currentResponsibleUser: User | null;

  @Column({ type: 'uuid', nullable: true })
  current_responsible_member_id: string | null;

  @ManyToOne(() => Member, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'current_responsible_member_id' })
  currentResponsibleMember: Member | null;

  @Column({ type: 'text', nullable: true })
  notes: string | null;

  @Column({ type: 'date', nullable: true })
  retired_at: string | null;

  @Column({ type: 'text', nullable: true })
  retirement_reason: string | null;

  @Column({ type: 'uuid', nullable: true })
  retirement_responsible_user_id: string | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'retirement_responsible_user_id' })
  retirementResponsibleUser: User | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  retirement_document_key: string | null;

  @OneToMany(() => AssetMovement, (movement) => movement.asset)
  movements: AssetMovement[];

  @OneToMany(() => AssetMaintenance, (maintenance) => maintenance.asset)
  maintenances: AssetMaintenance[];

  @OneToMany(() => AssetDocument, (document) => document.asset)
  documents: AssetDocument[];

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
