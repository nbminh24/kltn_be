import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Customer } from './customer.entity';

@Entity('customer_addresses')
export class CustomerAddress {
  @PrimaryGeneratedColumn('identity', { type: 'bigint', generatedIdentity: 'ALWAYS' })
  id: number;

  @Column({ type: 'bigint' })
  customer_id: number;

  @Column({ type: 'boolean', default: false })
  is_default: boolean;

  @Column({ type: 'varchar', default: 'Home' })
  address_type: string;

  @Column({ type: 'text' })
  detailed_address: string;

  @Column({ type: 'varchar' })
  phone_number: string;

  // Relations
  @ManyToOne(() => Customer, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'customer_id' })
  customer: Customer;
}
