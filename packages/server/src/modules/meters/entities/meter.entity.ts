import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Member } from '../../members/entities/member.entity';
import { Consumption } from '../../consumption/entities/consumption.entity';
import { SharePayment } from '../../shares/entities/share-payment.entity';
import { MeterTypeEntity } from './meter-type.entity';

export enum MeterStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  DECOMMISSIONED = 'decommissioned',
}

@Entity('meters')
export class Meter {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  code: string;

  @Column()
  member_id: string;

  @ManyToOne(() => Member, (member) => member.meters)
  @JoinColumn({ name: 'member_id' })
  member: Member;

  @Column({ type: 'text' })
  address: string;

  @Column({ type: 'decimal', precision: 10, scale: 8, nullable: true })
  latitude: string;

  @Column({ type: 'decimal', precision: 11, scale: 8, nullable: true })
  longitude: string;

  @Column({ nullable: true })
  type_id: string;

  @ManyToOne(() => MeterTypeEntity, { nullable: true, eager: true })
  @JoinColumn({ name: 'type_id' })
  type: MeterTypeEntity;

  @Column({ type: 'varchar', length: 20, default: MeterStatus.ACTIVE })
  status: MeterStatus;

  @CreateDateColumn()
  installed_at: Date;

  @CreateDateColumn()
  created_at: Date;

  @OneToMany(() => Consumption, (consumption) => consumption.meter)
  consumptions: Consumption[];

  @OneToMany(() => SharePayment, (sharePayment) => sharePayment.meter)
  sharePayments: SharePayment[];
}
