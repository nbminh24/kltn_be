import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { ChatSession } from './chat-session.entity';

@Entity('chat_messages')
export class ChatMessage {
  @PrimaryGeneratedColumn('identity', { type: 'bigint', generatedIdentity: 'ALWAYS' })
  id: number;

  @Column({ type: 'bigint', nullable: true })
  session_id: number;

  @Column({ type: 'varchar' })
  sender: string; // 'customer' | 'admin' | 'bot'

  @Column({ type: 'text' })
  message: string;

  @Column({ type: 'boolean', default: false })
  is_read: boolean;

  @Column({ type: 'text', nullable: true })
  image_url: string;

  @Column({ type: 'jsonb', nullable: true })
  custom: any;

  @Column({ type: 'jsonb', nullable: true })
  buttons: any;

  @Column({ type: 'varchar', length: 255, nullable: true })
  intent: string;

  @CreateDateColumn({ type: 'timestamp with time zone' })
  created_at: Date;

  // Relations
  @ManyToOne(() => ChatSession, session => session.messages, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'session_id' })
  session: ChatSession;
}
