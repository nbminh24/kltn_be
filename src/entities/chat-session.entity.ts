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

    @Column({ type: 'varchar', default: 'active' })
    status: string;

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
