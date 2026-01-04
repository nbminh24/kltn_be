import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import {
  AnalyticsController,
  ProductAnalyticsController,
  OperationsAnalyticsController,
} from './analytics.controller';
import { AnalyticsService } from './analytics.service';
import { Order } from '../../entities/order.entity';
import { OrderItem } from '../../entities/order-item.entity';
import { ProductVariant } from '../../entities/product-variant.entity';
import { Product } from '../../entities/product.entity';
import { Review } from '../../entities/review.entity';
import { SupportTicket } from '../../entities/support-ticket.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Order, OrderItem, ProductVariant, Product, Review, SupportTicket]),
  ],
  controllers: [AnalyticsController, ProductAnalyticsController, OperationsAnalyticsController],
  providers: [AnalyticsService],
  exports: [AnalyticsService],
})
export class AnalyticsModule {}
