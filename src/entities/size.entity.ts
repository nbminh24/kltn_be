import { Entity, Column, PrimaryGeneratedColumn, OneToMany } from 'typeorm';
import { ProductVariant } from './product-variant.entity';

@Entity('sizes')
export class Size {
  @PrimaryGeneratedColumn('identity', { type: 'bigint', generatedIdentity: 'ALWAYS' })
  id: number;

  @Column({ type: 'varchar' })
  name: string;

  @Column({ type: 'int', default: 0 })
  sort_order: number;

  // Relations
  @OneToMany(() => ProductVariant, variant => variant.size)
  variants: ProductVariant[];
}
