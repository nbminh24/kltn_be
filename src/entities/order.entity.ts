import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { Customer } from './customer.entity';
import { OrderItem } from './order-item.entity';

@Entity('orders')
export class Order {
  @PrimaryGeneratedColumn('identity')
  id: number;

  @Column({ type: 'bigint', nullable: true })
  customer_id: number;

  @Column({ type: 'varchar', unique: true, nullable: true })
  order_number: string;

  @Column({ type: 'varchar', nullable: true })
  customer_email: string;

  @Column({ type: 'text' })
  shipping_address: string;

  @Column({ type: 'varchar' })
  shipping_phone: string;

  @Column({ type: 'varchar', nullable: true })
  shipping_city: string;

  @Column({ type: 'varchar', nullable: true })
  shipping_district: string;

  @Column({ type: 'varchar', nullable: true })
  shipping_ward: string;

  @Column({ type: 'varchar', default: 'pending' })
  fulfillment_status: string;

  @Column({ type: 'varchar', default: 'unpaid' })
  payment_status: string;

  @Column({ type: 'varchar', default: 'cod' })
  payment_method: string;

  @Column({ type: 'varchar', default: 'standard', nullable: true })
  shipping_method: string;

  @Column({ type: 'varchar', nullable: true })
  tracking_number: string;

  @Column({ type: 'varchar', nullable: true })
  carrier_name: string;

  @Column({ type: 'date', nullable: true })
  estimated_delivery_from: Date;

  @Column({ type: 'date', nullable: true })
  estimated_delivery_to: Date;

  @Column({ type: 'date', nullable: true })
  actual_delivery_date: Date;

  @Column({ type: 'timestamp with time zone', nullable: true })
  cancelled_at: Date;

  @Column({ type: 'varchar', length: 50, nullable: true })
  cancel_reason: string;

  @Column({ type: 'bigint', nullable: true })
  cancelled_by_customer_id: number;

  @Column({ type: 'varchar', length: 20, default: 'pending', nullable: true })
  refund_status: string;

  @Column({ type: 'numeric', nullable: true })
  refund_amount: number;

  @Column({ type: 'numeric', default: 0 })
  shipping_fee: number;

  @Column({ type: 'numeric' })
  total_amount: number;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updated_at: Date;

  // Relations
  @ManyToOne(() => Customer, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'customer_id' })
  customer: Customer;

  @OneToMany(() => OrderItem, item => item.order)
  items: OrderItem[];
}
