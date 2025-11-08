import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, JoinColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';
import { Cart } from './cart.entity';
import { ProductVariant } from './product-variant.entity';

@Entity('cart_items')
export class CartItem {
  @PrimaryGeneratedColumn('identity')
  id: number;

  @Column({ type: 'bigint' })
  cart_id: number;

  @Column({ type: 'bigint' })
  variant_id: number;

  @Column({ type: 'int', default: 1 })
  quantity: number;

  @CreateDateColumn()
  added_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  // Relations
  @ManyToOne(() => Cart, cart => cart.items, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'cart_id' })
  cart: Cart;

  @ManyToOne(() => ProductVariant, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'variant_id' })
  variant: ProductVariant;
}
