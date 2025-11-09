import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ReviewsController } from './reviews.controller';
import { AdminReviewsController } from './admin-reviews.controller';
import { ReviewsService } from './reviews.service';
import { Review } from '../../entities/review.entity';
import { Order } from '../../entities/order.entity';
import { OrderItem } from '../../entities/order-item.entity';
import { ProductVariant } from '../../entities/product-variant.entity';
import { Product } from '../../entities/product.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Review,
      Order,
      OrderItem,
      ProductVariant,
      Product,
    ]),
  ],
  controllers: [ReviewsController, AdminReviewsController],
  providers: [ReviewsService],
  exports: [ReviewsService],
})
export class ReviewsModule {}
