import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
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

    // Format response to match API spec
    const formattedData = items.map(item => ({
      id: item.id,
      customer_id: item.customer_id,
      variant_id: item.variant_id,
      product: {
        id: item.variant?.product?.id,
        name: item.variant?.product?.name,
        slug: item.variant?.product?.slug,
        thumbnail_url: item.variant?.product?.thumbnail_url,
        selling_price: item.variant?.product?.selling_price,
        average_rating: item.variant?.product?.average_rating,
      },
      variant: {
        id: item.variant?.id,
        sku: item.variant?.sku,
        size: item.variant?.size?.name,
        color: item.variant?.color?.name,
        color_hex: item.variant?.color?.hex_code,
        available_stock: item.variant ? item.variant.total_stock - item.variant.reserved_stock : 0,
        in_stock: item.variant ? item.variant.total_stock - item.variant.reserved_stock > 0 : false,
      },
    }));

    return { data: formattedData, count: formattedData.length };
  }

  /**
   * Add to wishlist - Throws error if already exists
   */
  async addToWishlist(customerId: number, variantId: number) {
    // Check if variant exists and is active
    const variant = await this.variantRepository.findOne({
      where: { id: variantId as any, status: 'active' },
    });

    if (!variant) {
      throw new NotFoundException('Variant not found');
    }

    // Check if already in wishlist
    const existing = await this.wishlistItemRepository.findOne({
      where: { customer_id: customerId, variant_id: variantId },
    });

    if (existing) {
      throw new ConflictException('Variant already in wishlist');
    }

    // Add to wishlist
    const wishlistItem = this.wishlistItemRepository.create({
      customer_id: customerId,
      variant_id: variantId,
    });

    const saved = await this.wishlistItemRepository.save(wishlistItem);

    return {
      message: 'Added to wishlist',
      wishlist_item: {
        id: saved.id,
        customer_id: saved.customer_id,
        variant_id: saved.variant_id,
      },
    };
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
      throw new NotFoundException('Variant not in wishlist');
    }

    return { message: 'Removed from wishlist' };
  }

  /**
   * Clear entire wishlist
   */
  async clearWishlist(customerId: number) {
    const result = await this.wishlistItemRepository.delete({
      customer_id: customerId,
    });

    return {
      message: 'Wishlist cleared',
      deleted_count: result.affected || 0,
    };
  }
}
