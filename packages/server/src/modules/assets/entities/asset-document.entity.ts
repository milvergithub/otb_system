import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Asset } from './asset.entity';

export enum AssetDocumentKind {
  PHOTO = 'photo',
  INVOICE = 'invoice',
  DELIVERY_RECEIPT = 'delivery_receipt',
  OTHER = 'other',
}

@Entity('asset_documents')
@Index(['asset_id'])
export class AssetDocument {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  asset_id: string;

  @ManyToOne(() => Asset, (asset) => asset.documents, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'asset_id' })
  asset: Asset;

  @Column({ type: 'varchar', length: 500 })
  file_key: string;

  @Column({ type: 'varchar', length: 200 })
  file_name: string;

  @Column({ type: 'varchar', length: 100 })
  mime_type: string;

  @Column({ type: 'integer', nullable: true })
  file_size: number | null;

  @Column({
    type: 'varchar',
    length: 20,
    default: AssetDocumentKind.PHOTO,
  })
  kind: AssetDocumentKind;

  @Column({ type: 'uuid', nullable: true })
  uploaded_by: string | null;

  @ManyToOne(() => User, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'uploaded_by' })
  uploadedBy: User | null;

  @CreateDateColumn()
  created_at: Date;
}
