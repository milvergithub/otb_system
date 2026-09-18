import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

export enum DiscountType {
  FIXED = 'fixed',
  PERCENTAGE = 'percentage',
}

@Entity('discounts')
export class Discount {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ type: 'varchar', length: 20, default: DiscountType.FIXED })
  type: DiscountType;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  value: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ default: true })
  is_active: boolean;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
