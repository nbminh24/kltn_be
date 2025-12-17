import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';
import { JwtModule } from '@nestjs/jwt';
import { ChatbotController } from './chatbot.controller';
import { ChatbotService } from './chatbot.service';

// Import entities
import { Customer } from '../../entities/customer.entity';
import { ProductVariant } from '../../entities/product-variant.entity';
import { Product } from '../../entities/product.entity';
import { Order } from '../../entities/order.entity';
import { OrderItem } from '../../entities/order-item.entity';
import { OrderStatusHistory } from '../../entities/order-status-history.entity';
import { Cart } from '../../entities/cart.entity';
import { CartItem } from '../../entities/cart-item.entity';
import { WishlistItem } from '../../entities/wishlist-item.entity';

// Import services from other modules
import { CartService } from '../cart/cart.service';
import { WishlistService } from '../wishlist/wishlist.service';
import { OrdersModule } from '../orders/orders.module';

@Module({
    imports: [
        ConfigModule,
        HttpModule,
        OrdersModule,
        JwtModule.registerAsync({
            imports: [ConfigModule],
            inject: [ConfigService],
            useFactory: (configService: ConfigService) => ({
                secret: configService.get<string>('JWT_SECRET'),
                signOptions: { expiresIn: '15m' },
            }),
        }),
        TypeOrmModule.forFeature([
            Customer,
            ProductVariant,
            Product,
            Order,
            OrderItem,
            OrderStatusHistory,
            Cart,
            CartItem,
            WishlistItem,
        ]),
    ],
    controllers: [ChatbotController],
    providers: [
        ChatbotService,
        CartService,
        WishlistService,
    ],
    exports: [ChatbotService],
})
export class ChatbotModule { }
