import {
  Column,
  CreateDateColumn,
  Entity,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
  JoinColumn,
} from 'typeorm';
import { ZoneTypeEntity } from './entities/zone-type.entity';

@Entity('zones')
export class Zone {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column({ type: 'varchar', length: 20, default: 'zone' })
  type: string;

  @Column({ type: 'jsonb' })
  geometry: Record<string, unknown>;

  @Column({ type: 'varchar', length: 7, nullable: true })
  color: string;

  @Column({ type: 'integer', default: 3 })
  line_width: number;

  @ManyToOne(() => ZoneTypeEntity, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'zone_type_id' })
  zoneType: ZoneTypeEntity | null;

  @Column({ type: 'uuid', nullable: true })
  zone_type_id: string | null;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
