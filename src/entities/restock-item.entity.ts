import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { RestockBatch } from './restock-batch.entity';
import { ProductVariant } from './product-variant.entity';

@Entity('restock_items')
export class RestockItem {
  @PrimaryGeneratedColumn('identity', { type: 'bigint' })
  id: number;

  @Column({ type: 'bigint' })
  batch_id: number;

  @Column({ type: 'bigint' })
  variant_id: number;

  @Column({ type: 'int' })
  quantity: number;

  // Relations
  @ManyToOne(() => RestockBatch, batch => batch.items)
  @JoinColumn({ name: 'batch_id' })
  batch: RestockBatch;

  @ManyToOne(() => ProductVariant)
  @JoinColumn({ name: 'variant_id' })
  variant: ProductVariant;
}
