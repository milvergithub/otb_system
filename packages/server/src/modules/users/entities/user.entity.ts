import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  JoinTable,
  ManyToMany,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Role } from '../../roles/entities/role.entity';
import { Member } from '../../members/entities/member.entity';

export enum UserRole {
  ADMIN = 'admin',
  USER = 'user',
}

export function legacyRoleFromRoles(
  roles: Pick<Role, 'name'>[] | undefined | null,
): UserRole {
  return roles?.some((r) => r.name === 'admin')
    ? UserRole.ADMIN
    : UserRole.USER;
}

@Entity('users')
export class User {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ unique: true })
  email: string;

  @Column()
  password_hash: string;

  @Column()
  full_name: string;

  @Column({
    type: 'varchar',
    length: 20,
    default: UserRole.USER,
  })
  role: UserRole;

  @Column({ default: true })
  is_active: boolean;

  /**
   * Set whenever the account is provisioned by someone else, so the holder
   * knows only a temporary secret. Cleared by the self-service change endpoint
   * and by every admin-driven regeneration.
   */
  @Column({ default: false })
  must_change_password: boolean;

  @Column({ type: 'uuid', nullable: true })
  member_id: string | null;

  @ManyToOne(() => Member, { nullable: true, eager: false })
  @JoinColumn({ name: 'member_id' })
  member: Member | null;

  @ManyToMany(() => Role, (role) => role.id, { eager: true })
  @JoinTable({
    name: 'user_roles',
    joinColumn: { name: 'user_id' },
    inverseJoinColumn: { name: 'role_id' },
  })
  roles: Role[];

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
