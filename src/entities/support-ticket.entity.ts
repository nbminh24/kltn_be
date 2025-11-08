import { Entity, Column, PrimaryColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('support_tickets')
export class SupportTicket {
  @PrimaryColumn({ type: 'varchar', length: 50 })
  id: string;

  @Column({ type: 'varchar', length: 255 })
  customer_name: string;

  @Column({ type: 'varchar', length: 255 })
  customer_email: string;

  @Column({ type: 'varchar', length: 500 })
  subject: string;

  @Column({ type: 'text' })
  message: string;

  @Column({ type: 'varchar', length: 20, default: 'pending' })
  status: string; // pending, in_progress, resolved, closed

  @Column({ type: 'varchar', length: 20, default: 'medium' })
  priority: string; // low, medium, high, urgent

  @Column({ type: 'boolean', default: false })
  ai_attempted: boolean;

  @Column({ type: 'text', nullable: true })
  admin_reply: string;

  @Column({ type: 'timestamp', nullable: true })
  replied_at: Date;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
