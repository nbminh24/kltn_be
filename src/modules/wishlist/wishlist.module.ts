import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WishlistController } from './wishlist.controller';
import { WishlistService } from './wishlist.service';
import { WishlistItem } from '../../entities/wishlist-item.entity';
import { ProductVariant } from '../../entities/product-variant.entity';

@Module({
  imports: [TypeOrmModule.forFeature([WishlistItem, ProductVariant])],
  controllers: [WishlistController],
  providers: [WishlistService],
  exports: [WishlistService],
})
export class WishlistModule {}
