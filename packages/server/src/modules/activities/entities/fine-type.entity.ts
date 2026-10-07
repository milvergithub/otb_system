import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum FineTypeCode {
  ABSENT_START = 'absent_start',
  ABSENT_BOTH = 'absent_both',
  ABSENT_END = 'absent_end',
}

export enum FineTypeAppliesTo {
  ABSENT = 'absent',
  LATE = 'late',
  LEFT_EARLY = 'left_early',
  MANUAL = 'manual',
}

@Entity('fine_types')
export class FineType {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 50 })
  code: string;

  @Column()
  name: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  amount: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  applies_to: FineTypeAppliesTo | null;

  @Column({ default: true })
  is_active: boolean;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
