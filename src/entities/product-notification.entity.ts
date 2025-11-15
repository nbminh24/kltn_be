import { Entity, Column, PrimaryColumn, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Product } from './product.entity';
import { User } from './user.entity';

@Entity('product_notifications')
export class ProductNotification {
    @PrimaryColumn({ type: 'varchar', length: 50 })
    id: string;

    @Column({ type: 'bigint' })
    user_id: number;

    @Column({ type: 'bigint' })
    product_id: number;

    @Column({ type: 'varchar', length: 10, nullable: true })
    size: string;

    @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true })
    price_condition: number;

    @Column({ type: 'varchar', length: 20, default: 'active' })
    status: string; // 'active', 'notified', 'cancelled'

    @CreateDateColumn()
    created_at: Date;

    @Column({ type: 'timestamp', nullable: true })
    notified_at: Date;

    @ManyToOne(() => User)
    @JoinColumn({ name: 'user_id' })
    user: User;

    @ManyToOne(() => Product)
    @JoinColumn({ name: 'product_id' })
    product: Product;
}
