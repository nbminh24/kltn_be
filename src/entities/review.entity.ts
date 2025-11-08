import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Product } from './product.entity';
import { User } from './user.entity';

@Entity('reviews')
export class Review {
  @PrimaryGeneratedColumn('identity')
  id: number;

  @Column({ type: 'bigint' })
  product_id: number;

  @Column({ type: 'bigint' })
  user_id: number;

  @Column({ type: 'int' })
  rating: number; // 1-5

  @Column({ type: 'varchar', length: 255, nullable: true })
  title: string;

  @Column({ type: 'text' })
  comment: string;

  @Column({ type: 'boolean', default: false })
  verified_purchase: boolean;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  // Relations
  @ManyToOne(() => Product, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'product_id' })
  product: Product;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;
}
