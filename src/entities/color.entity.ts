import { Entity, Column, PrimaryGeneratedColumn, OneToMany } from 'typeorm';
import { ProductVariant } from './product-variant.entity';

@Entity('colors')
export class Color {
  @PrimaryGeneratedColumn('identity', { type: 'bigint', generatedIdentity: 'ALWAYS' })
  id: number;

  @Column({ type: 'varchar' })
  name: string;

  @Column({ type: 'varchar', nullable: true })
  hex_code: string;

  // Relations
  @OneToMany(() => ProductVariant, variant => variant.color)
  variants: ProductVariant[];
}
