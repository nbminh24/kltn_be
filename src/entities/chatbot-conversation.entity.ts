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
import { ChatbotMessage } from './chatbot-message.entity';

@Entity('chatbot_conversations')
export class ChatbotConversation {
  @PrimaryColumn({ type: 'varchar', length: 50 })
  id: string;

  @Column({ type: 'varchar', length: 50, nullable: true })
  user_id: string;

  @Column({ type: 'varchar', length: 100 })
  session_id: string;

  @Column({ type: 'text', nullable: true })
  last_message: string;

  @Column({ type: 'int', default: 0 })
  message_count: number;

  @Column({ type: 'boolean', default: false })
  resolved: boolean;

  @Column({ type: 'varchar', length: 100, nullable: true })
  intent: string;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  // Relations
  @ManyToOne(() => User, user => user.conversations, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'user_id' })
  user: User;

  @OneToMany(() => ChatbotMessage, message => message.conversation)
  messages: ChatbotMessage[];
}
