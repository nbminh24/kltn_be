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
import { ChatMessage } from './chat-message.entity';

@Entity('chat_sessions')
export class ChatSession {
    @PrimaryGeneratedColumn('identity', { type: 'bigint', generatedIdentity: 'ALWAYS' })
    id: number;

    @Column({ type: 'bigint', nullable: true })
    customer_id: number;

    @Column({ type: 'varchar', nullable: true })
    visitor_id: string;

    @Column({ type: 'varchar', default: 'bot' })
    status: string; // 'bot' | 'human_pending' | 'human_active' | 'closed'

    @Column({ type: 'bigint', nullable: true })
    assigned_admin_id: number;

    @Column({ type: 'timestamp with time zone', nullable: true })
    handoff_requested_at: Date;

    @Column({ type: 'timestamp with time zone', nullable: true })
    handoff_accepted_at: Date;

    @Column({ type: 'varchar', length: 255, nullable: true })
    handoff_reason: string;

    @CreateDateColumn({ type: 'timestamp with time zone' })
    created_at: Date;

    @UpdateDateColumn({ type: 'timestamp with time zone' })
    updated_at: Date;

    // Relations
    @ManyToOne(() => Customer, { onDelete: 'SET NULL' })
    @JoinColumn({ name: 'customer_id' })
    customer: Customer;

    @OneToMany(() => ChatMessage, message => message.session)
    messages: ChatMessage[];
}
