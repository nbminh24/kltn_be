import { Entity, Column, PrimaryGeneratedColumn, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { Product } from './product.entity';
import { Size } from './size.entity';
import { Color } from './color.entity';
import { ProductImage } from './product-image.entity';

@Entity('product_variants')
export class ProductVariant {
  @PrimaryGeneratedColumn('identity', { type: 'bigint', generatedIdentity: 'ALWAYS' })
  id: number;

  @Column({ type: 'bigint' })
  product_id: number;

  @Column({ type: 'bigint', nullable: true })
  size_id: number;

  @Column({ type: 'bigint', nullable: true })
  color_id: number;

  @Column({ type: 'varchar', nullable: true })
  name: string;

  @Column({ type: 'varchar', unique: true })
  sku: string;

  @Column({ type: 'int', default: 0 })
  total_stock: number;

  @Column({ type: 'int', default: 0 })
  reserved_stock: number;

  @Column({ type: 'int', default: 0 })
  reorder_point: number;

  @Column({ type: 'varchar', default: 'active' })
  status: string;

  @Column({ type: 'int', default: 1 })
  version: number;

  @Column({ type: 'timestamp with time zone', nullable: true })
  deleted_at: Date;

  // Relations
  @ManyToOne(() => Product, product => product.variants)
  @JoinColumn({ name: 'product_id' })
  product: Product;

  @ManyToOne(() => Size, size => size.variants)
  @JoinColumn({ name: 'size_id' })
  size: Size;

  @ManyToOne(() => Color, color => color.variants)
  @JoinColumn({ name: 'color_id' })
  color: Color;

  @OneToMany(() => ProductImage, image => image.variant)
  images: ProductImage[];

  @OneToMany('OrderItem', 'variant')
  order_items: any[];
}
