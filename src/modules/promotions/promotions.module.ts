import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PromotionsController } from './promotions.controller';
import { PromotionsService } from './promotions.service';
import { AdminPromotionsController } from './admin-promotions.controller';
import { AdminPromotionsService } from './admin-promotions.service';
import { Promotion } from '../../entities/promotion.entity';
import { PromotionProduct } from '../../entities/promotion-product.entity';
import { Product } from '../../entities/product.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Promotion, PromotionProduct, Product])],
  controllers: [PromotionsController, AdminPromotionsController],
  providers: [PromotionsService, AdminPromotionsService],
  exports: [PromotionsService, AdminPromotionsService],
})
export class PromotionsModule { }
