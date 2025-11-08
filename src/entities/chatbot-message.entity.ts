import { Entity, Column, PrimaryColumn, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { ChatbotConversation } from './chatbot-conversation.entity';

@Entity('chatbot_messages')
export class ChatbotMessage {
  @PrimaryColumn({ type: 'varchar', length: 50 })
  id: string;

  @Column({ type: 'varchar', length: 50 })
  conversation_id: string;

  @Column({ type: 'varchar', length: 10 })
  sender: string; // 'user' hoặc 'bot'

  @Column({ type: 'text' })
  message: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  image_url: string;

  @CreateDateColumn({ name: 'timestamp' })
  timestamp: Date;

  // Relations
  @ManyToOne(() => ChatbotConversation, conversation => conversation.messages, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'conversation_id' })
  conversation: ChatbotConversation;
}
