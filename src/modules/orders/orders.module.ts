import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { DeliveryEstimationService } from './delivery-estimation.service';
import { Order } from '../../entities/order.entity';
import { OrderItem } from '../../entities/order-item.entity';
import { Cart } from '../../entities/cart.entity';
import { CartItem } from '../../entities/cart-item.entity';
import { Customer } from '../../entities/customer.entity';
import { OrderStatusHistory } from '../../entities/order-status-history.entity';
import { ProductVariant } from '../../entities/product-variant.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Order, OrderItem, Cart, CartItem, Customer, OrderStatusHistory, ProductVariant]),
    ConfigModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: '15m' },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [OrdersController],
  providers: [OrdersService, DeliveryEstimationService],
  exports: [OrdersService],
})
export class OrdersModule { }
