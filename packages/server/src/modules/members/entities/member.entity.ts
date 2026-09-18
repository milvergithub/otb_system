import {
  Column,
  CreateDateColumn,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Meter } from '../../meters/entities/meter.entity';

@Entity('members')
export class Member {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  ci: string;

  @Column()
  first_name: string;

  @Column()
  last_name: string;

  @Column({ nullable: true })
  phone: string;

  @Column({ length: 2, default: 'BO' })
  phone_country: string;

  @Column({ type: 'text', nullable: true })
  address: string;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @OneToMany(() => Meter, (meter) => meter.member)
  meters: Meter[];
}
