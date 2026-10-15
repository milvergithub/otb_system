import {
  CreateDateColumn,
  UpdateDateColumn,
  PrimaryGeneratedColumn,
  Column,
  Entity,
  Index,
} from 'typeorm';

export enum SurchargeType {
  FIXED = 'fixed',
  PERCENTAGE = 'percentage',
}

@Entity('surcharges')
@Index('UQ_surcharges_name', ['name'], { unique: true })
export class Surcharge {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ type: 'varchar', length: 20, default: SurchargeType.FIXED })
  type: SurchargeType;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  value: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ default: true })
  is_active: boolean;

  @Column({ default: false })
  is_default: boolean;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
