import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProductsController } from './products.controller';
import { ProductsService } from './products.service';
import { AdminProductsController } from './admin-products.controller';
import { AdminProductsService } from './admin-products.service';
import { AdminVariantsController } from './admin-variants.controller';
import { ProductVariantsService } from './product-variants.service';
import { AdminImagesController } from './admin-images.controller';
import { ProductImagesService } from './product-images.service';
import { Product } from '../../entities/product.entity';
import { ProductImage } from '../../entities/product-image.entity';
import { ProductVariant } from '../../entities/product-variant.entity';
import { Size } from '../../entities/size.entity';
import { Color } from '../../entities/color.entity';
import { Review } from '../../entities/review.entity';
import { Category } from '../../entities/category.entity';
import { Order } from '../../entities/order.entity';
import { OrderItem } from '../../entities/order-item.entity';
import { Promotion } from '../../entities/promotion.entity';
import { PromotionProduct } from '../../entities/promotion-product.entity';
import { ProductNotification } from '../../entities/product-notification.entity';
import { CommonModule } from '../../common/common.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Product,
      ProductImage,
      ProductVariant,
      Size,
      Color,
      Review,
      Category,
      Order,
      OrderItem,
      Promotion,
      PromotionProduct,
      ProductNotification,
    ]),
    CommonModule,
  ],
  controllers: [
    ProductsController,
    AdminProductsController,
    AdminVariantsController,
    AdminImagesController,
  ],
  providers: [
    ProductsService,
    AdminProductsService,
    ProductVariantsService,
    ProductImagesService,
  ],
  exports: [
    ProductsService,
    AdminProductsService,
    ProductVariantsService,
    ProductImagesService,
  ],
})
export class ProductsModule { }
