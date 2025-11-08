import {
  Entity,
  Column,
  PrimaryColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { User } from './user.entity';
import { OrderItem } from './order-item.entity';

@Entity('orders')
export class Order {
  @PrimaryColumn({ type: 'varchar', length: 50 })
  id: string;

  @Column({ type: 'varchar', length: 50 })
  user_id: string;

  @CreateDateColumn()
  order_date: Date;

  @Column({ type: 'varchar', length: 20, default: 'Pending' })
  status: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  subtotal: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  discount: number;

  @Column({ type: 'varchar', length: 50, nullable: true })
  promo_code: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  delivery_fee: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  total: number;

  @Column({ type: 'varchar', length: 20 })
  payment_method: string;

  @Column({ type: 'varchar', length: 20, default: 'Pending' })
  payment_status: string;

  @Column({ type: 'varchar', length: 255 })
  shipping_name: string;

  @Column({ type: 'varchar', length: 20 })
  shipping_phone: string;

  @Column({ type: 'varchar', length: 500 })
  shipping_address: string;

  @Column({ type: 'varchar', length: 100 })
  shipping_city: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  shipping_state: string;

  @Column({ type: 'varchar', length: 20 })
  shipping_postal_code: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  tracking_number: string;

  @Column({ type: 'timestamp', nullable: true })
  delivered_date: Date;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  // Relations
  @ManyToOne(() => User, user => user.orders, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @OneToMany(() => OrderItem, orderItem => orderItem.order)
  items: OrderItem[];
}
