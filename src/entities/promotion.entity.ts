import { Entity, Column, PrimaryGeneratedColumn, OneToMany } from 'typeorm';
import { PromotionProduct } from './promotion-product.entity';

@Entity('promotions')
export class Promotion {
  @PrimaryGeneratedColumn('identity', { type: 'bigint', generatedIdentity: 'ALWAYS' })
  id: number;

  @Column({ type: 'varchar' })
  name: string;

  @Column({ type: 'varchar' }) // 'flash_sale' | 'coupon'
  type: string;

  @Column({ type: 'numeric' })
  discount_value: number;

  @Column({ type: 'varchar' }) // 'percentage' | 'fixed'
  discount_type: string;

  @Column({ type: 'int', nullable: true })
  number_limited: number;

  @Column({ type: 'timestamp with time zone' })
  start_date: Date;

  @Column({ type: 'timestamp with time zone' })
  end_date: Date;

  @Column({ type: 'varchar', default: 'scheduled' })
  status: string; // 'scheduled' | 'active' | 'expired'

  // Relations
  @OneToMany(() => PromotionProduct, pp => pp.promotion)
  promotion_products: PromotionProduct[];
}
