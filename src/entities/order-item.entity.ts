import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Order } from './order.entity';
import { ProductVariant } from './product-variant.entity';

@Entity('order_items')
export class OrderItem {
  @PrimaryGeneratedColumn('identity')
  id: number;

  @Column({ type: 'bigint' })
  order_id: number;

  @Column({ type: 'bigint' })
  variant_id: number;

  @Column({ type: 'int' })
  quantity: number;

  @Column({ type: 'numeric' })
  price_at_purchase: number;

  // Relations
  @ManyToOne(() => Order, order => order.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'order_id' })
  order: Order;

  @ManyToOne(() => ProductVariant, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'variant_id' })
  variant: ProductVariant;
}
