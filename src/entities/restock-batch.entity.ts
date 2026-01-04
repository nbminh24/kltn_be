import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
  OneToMany,
} from 'typeorm';
import { Admin } from './admin.entity';
import { RestockItem } from './restock-item.entity';

@Entity('restock_batches')
export class RestockBatch {
  @PrimaryGeneratedColumn('identity', { type: 'bigint' })
  id: number;

  @Column({ type: 'bigint' })
  admin_id: number;

  @Column({ type: 'varchar', default: 'Manual' })
  type: string; // 'Manual', 'Excel', 'API'

  @CreateDateColumn({ type: 'timestamp with time zone' })
  created_at: Date;

  // Relations
  @ManyToOne(() => Admin)
  @JoinColumn({ name: 'admin_id' })
  admin: Admin;

  @OneToMany(() => RestockItem, item => item.batch)
  items: RestockItem[];
}
