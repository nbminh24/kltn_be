import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Wishlist } from '../../entities/wishlist.entity';
import { Product } from '../../entities/product.entity';
import { IdGenerator } from '../../common/utils/id-generator';

@Injectable()
export class WishlistService {
  constructor(
    @InjectRepository(Wishlist)
    private wishlistRepository: Repository<Wishlist>,
    @InjectRepository(Product)
    private productRepository: Repository<Product>,
  ) {}

  async getWishlist(userId: string) {
    const items = await this.wishlistRepository.find({
      where: { user_id: userId },
      relations: ['product', 'product.images', 'product.category'],
      order: { added_at: 'DESC' },
    });

    return { items, count: items.length };
  }

  async addToWishlist(userId: string, productId: string) {
    const product = await this.productRepository.findOne({ where: { id: parseInt(productId) as any } });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    const existing = await this.wishlistRepository.findOne({
      where: { user_id: userId, product_id: productId },
    });

    if (existing) {
      throw new ConflictException('Product already in wishlist');
    }

    const wishlistItem = this.wishlistRepository.create({
      id: IdGenerator.generate('wish'),
      user_id: userId,
      product_id: productId,
    });

    await this.wishlistRepository.save(wishlistItem);

    return { message: 'Added to wishlist', item: wishlistItem };
  }

  async removeFromWishlist(userId: string, productId: string) {
    const result = await this.wishlistRepository.delete({
      user_id: userId,
      product_id: productId,
    });

    if (result.affected === 0) {
      throw new NotFoundException('Wishlist item not found');
    }

    return { message: 'Removed from wishlist' };
  }
}
