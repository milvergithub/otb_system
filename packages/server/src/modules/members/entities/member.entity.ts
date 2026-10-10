import {
  Column,
  CreateDateColumn,
  DeleteDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Meter } from '../../meters/entities/meter.entity';
import { MemberType } from './member-type.entity';

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

  @Column({ type: 'uuid', nullable: true })
  member_type_id: string | null;

  @ManyToOne(() => MemberType, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'member_type_id' })
  member_type: MemberType | null;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  /** Set when the member is logically deleted; NULL means active. */
  @DeleteDateColumn({ name: 'deleted_at', nullable: true })
  deleted_at: Date | null;

  @OneToMany(() => Meter, (meter) => meter.member)
  meters: Meter[];
}
