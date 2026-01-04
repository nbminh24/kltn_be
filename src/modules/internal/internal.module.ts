import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { InternalController } from './internal.controller';
import { InternalService } from './internal.service';
import { Order } from '../../entities/order.entity';
import { Product } from '../../entities/product.entity';
import { Customer } from '../../entities/customer.entity';
import { Page } from '../../entities/page.entity';
import { ProductVariant } from '../../entities/product-variant.entity';
import { Promotion } from '../../entities/promotion.entity';
import { SupportTicket } from '../../entities/support-ticket.entity';
import { ProductNotification } from '../../entities/product-notification.entity';
import { Size } from '../../entities/size.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Order,
      Product,
      Page,
      ProductVariant,
      Customer,
      Promotion,
      SupportTicket,
      ProductNotification,
      Size,
    ]),
  ],
  controllers: [InternalController],
  providers: [InternalService],
  exports: [InternalService],
})
export class InternalModule {}
