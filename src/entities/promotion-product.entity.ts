import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { Promotion } from './promotion.entity';
import { Product } from './product.entity';

@Entity('promotion_products')
export class PromotionProduct {
  @PrimaryGeneratedColumn('identity', { type: 'bigint', generatedIdentity: 'ALWAYS' })
  id: number;

  @Column({ type: 'bigint' })
  promotion_id: number;

  @Column({ type: 'bigint' })
  product_id: number;

  @Column({ type: 'numeric' })
  flash_sale_price: number;

  // Relations
  @ManyToOne(() => Promotion, promotion => promotion.promotion_products)
  @JoinColumn({ name: 'promotion_id' })
  promotion: Promotion;

  @ManyToOne(() => Product)
  @JoinColumn({ name: 'product_id' })
  product: Product;
}
