import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WishlistItem } from '../../entities/wishlist-item.entity';
import { ProductVariant } from '../../entities/product-variant.entity';

@Injectable()
export class WishlistService {
  constructor(
    @InjectRepository(WishlistItem)
    private wishlistItemRepository: Repository<WishlistItem>,
    @InjectRepository(ProductVariant)
    private variantRepository: Repository<ProductVariant>,
  ) {}

  async getWishlist(customerId: number) {
    const items = await this.wishlistItemRepository
      .createQueryBuilder('wishlist')
      .leftJoinAndSelect('wishlist.variant', 'variant')
      .leftJoinAndSelect('variant.product', 'product')
      .leftJoinAndSelect('variant.size', 'size')
      .leftJoinAndSelect('variant.color', 'color')
      .leftJoinAndSelect('variant.images', 'images')
      .leftJoinAndSelect('product.category', 'category')
      .where('wishlist.customer_id = :customerId', { customerId })
      .orderBy('wishlist.id', 'DESC')
      .getMany();

    return { data: items, count: items.length };
  }

  /**
   * Toggle wishlist - Add if not exists, Remove if exists (UC-C9)
   */
  async toggleWishlist(customerId: number, variantId: number) {
    // Check if variant exists
    const variant = await this.variantRepository.findOne({ 
      where: { id: variantId, status: 'active' },
    });

    if (!variant) {
      throw new NotFoundException('Variant not found');
    }

    // Check if already in wishlist
    const existing = await this.wishlistItemRepository.findOne({
      where: { customer_id: customerId, variant_id: variantId },
    });

    if (existing) {
      // Remove from wishlist
      await this.wishlistItemRepository.remove(existing);
      return { 
        message: 'Đã xóa khỏi Yêu thích',
        action: 'removed',
        in_wishlist: false,
      };
    } else {
      // Add to wishlist
      const wishlistItem = this.wishlistItemRepository.create({
        customer_id: customerId,
        variant_id: variantId,
      });

      await this.wishlistItemRepository.save(wishlistItem);
      
      return { 
        message: 'Đã thêm vào Yêu thích',
        action: 'added',
        in_wishlist: true,
        item: wishlistItem,
      };
    }
  }

  async removeFromWishlist(customerId: number, variantId: number) {
    const result = await this.wishlistItemRepository.delete({
      customer_id: customerId,
      variant_id: variantId,
    });

    if (result.affected === 0) {
      throw new NotFoundException('Wishlist item not found');
    }

    return { message: 'Đã xóa khỏi Yêu thích' };
  }
}
