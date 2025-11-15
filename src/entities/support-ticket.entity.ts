import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Customer } from './customer.entity';

@Entity('support_tickets')
export class SupportTicket {
  @PrimaryGeneratedColumn('identity', { type: 'bigint', generatedIdentity: 'ALWAYS' })
  id: number;

  @Column({ type: 'varchar', unique: true })
  ticket_code: string;

  @Column({ type: 'bigint', nullable: true })
  customer_id: number;

  @Column({ type: 'varchar', nullable: true })
  customer_email: string;

  @Column({ type: 'bigint', nullable: true })
  user_id: number;

  @Column({ type: 'varchar' })
  subject: string;

  @Column({ type: 'text', nullable: true })
  message: string;

  @Column({ type: 'varchar', default: 'pending' })
  status: string; // pending, in_progress, resolved, closed

  @Column({ type: 'varchar', default: 'medium', nullable: true })
  priority: string; // high, medium, low

  @Column({ type: 'varchar', default: 'contact_form' })
  source: string; // contact_form, chatbot, email

  @CreateDateColumn({ type: 'timestamp with time zone' })
  created_at: Date;

  @UpdateDateColumn({ type: 'timestamp with time zone' })
  updated_at: Date;

  // Relations
  @ManyToOne(() => Customer, { onDelete: 'SET NULL', nullable: true })
  @JoinColumn({ name: 'customer_id' })
  customer: Customer;
}
