import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CheckoutController } from './checkout.controller';
import { PaymentController } from './payment.controller';
import { CheckoutService } from './checkout.service';
import { PaymentService } from './payment.service';
import { Order } from '../../entities/order.entity';
import { OrderItem } from '../../entities/order-item.entity';
import { Cart } from '../../entities/cart.entity';
import { CartItem } from '../../entities/cart-item.entity';
import { CustomerAddress } from '../../entities/customer-address.entity';
import { ProductVariant } from '../../entities/product-variant.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Order,
      OrderItem,
      Cart,
      CartItem,
      CustomerAddress,
      ProductVariant,
    ]),
  ],
  controllers: [CheckoutController, PaymentController],
  providers: [CheckoutService, PaymentService],
  exports: [CheckoutService, PaymentService],
})
export class CheckoutModule {}
