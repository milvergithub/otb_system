import {
  Column,
  CreateDateColumn,
  Entity,
  PrimaryGeneratedColumn,
} from 'typeorm';

@Entity('tariffs')
export class Tariff {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  min_cubic_meters: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
  max_cubic_meters: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  price_per_cubic_meter: string;

  @Column({ type: 'date', nullable: true })
  valid_from: string;

  @Column({ type: 'date', nullable: true })
  valid_until: string;

  @Column({ default: true })
  is_active: boolean;

  @CreateDateColumn()
  created_at: Date;
}
