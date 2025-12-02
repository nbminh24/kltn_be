import {
    Entity,
    Column,
    PrimaryGeneratedColumn,
    CreateDateColumn,
    ManyToOne,
    JoinColumn,
} from 'typeorm';
import { Promotion } from './promotion.entity';
import { Order } from './order.entity';
import { Customer } from './customer.entity';

@Entity('promotion_usage')
export class PromotionUsage {
    @PrimaryGeneratedColumn('identity', { type: 'bigint', generatedIdentity: 'ALWAYS' })
    id: number;

    @Column({ type: 'bigint' })
    promotion_id: number;

    @Column({ type: 'bigint' })
    order_id: number;

    @Column({ type: 'bigint' })
    customer_id: number;

    @CreateDateColumn({ type: 'timestamp with time zone' })
    created_at: Date;

    // Relations
    @ManyToOne(() => Promotion, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'promotion_id' })
    promotion: Promotion;

    @ManyToOne(() => Order, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'order_id' })
    order: Order;

    @ManyToOne(() => Customer, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'customer_id' })
    customer: Customer;
}
