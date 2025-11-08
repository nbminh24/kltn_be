import {
  Entity,
  Column,
  PrimaryColumn,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { Order } from './order.entity';
import { Review } from './review.entity';
import { Wishlist } from './wishlist.entity';
import { CartItem } from './cart-item.entity';
import { Address } from './address.entity';
import { ChatbotConversation } from './chatbot-conversation.entity';
import { AiRecommendation } from './ai-recommendation.entity';

@Entity('users')
export class User {
  @PrimaryColumn({ type: 'varchar', length: 50 })
  id: string;

  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'varchar', length: 255, unique: true })
  email: string;

  @Column({ type: 'varchar', length: 255, select: false })
  password_hash: string;

  @Column({ type: 'varchar', length: 20, nullable: true })
  phone: string;

  @Column({ type: 'int', default: 0 })
  orders_count: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0 })
  total_spent: number;

  @Column({ type: 'varchar', length: 20, default: 'Active' })
  status: string;

  @Column({ type: 'varchar', length: 20, default: 'customer' })
  role: string;

  @Column({ type: 'boolean', default: false })
  email_verified: boolean;

  @Column({ type: 'varchar', length: 255, nullable: true, select: false })
  verification_token: string;

  @Column({ type: 'timestamp', nullable: true, select: false })
  verification_token_expires: Date;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  // Relations
  @OneToMany(() => Order, order => order.user)
  orders: Order[];

  @OneToMany(() => Review, review => review.user)
  reviews: Review[];

  @OneToMany(() => Wishlist, wishlist => wishlist.user)
  wishlists: Wishlist[];

  @OneToMany(() => CartItem, cartItem => cartItem.user)
  cart_items: CartItem[];

  @OneToMany(() => Address, address => address.user)
  addresses: Address[];

  @OneToMany(() => ChatbotConversation, conversation => conversation.user)
  conversations: ChatbotConversation[];

  @OneToMany(() => AiRecommendation, recommendation => recommendation.user)
  recommendations: AiRecommendation[];
}
