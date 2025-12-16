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
