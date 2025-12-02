import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  OneToMany,
} from 'typeorm';
import { Product } from './product.entity';

@Entity('categories')
export class Category {
  @PrimaryGeneratedColumn('identity', { type: 'bigint', generatedIdentity: 'ALWAYS' })
  id: number;

  @Column({ type: 'varchar' })
  name: string;

  @Column({ type: 'varchar', unique: true })
  slug: string;

  @Column({ type: 'varchar', default: 'active' })
  status: string;

  @Column({ type: 'timestamp with time zone', nullable: true })
  deleted_at: Date;

  // Relations
  @OneToMany(() => Product, product => product.category)
  products: Product[];
}
