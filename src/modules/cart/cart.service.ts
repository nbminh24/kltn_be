import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CartItem } from '../../entities/cart-item.entity';
import { Product } from '../../entities/product.entity';
import { Promotion } from '../../entities/promotion.entity';
import { IdGenerator } from '../../common/utils/id-generator';

@Injectable()
export class CartService {
  constructor(
    @InjectRepository(CartItem)
    private cartItemRepository: Repository<CartItem>,
    @InjectRepository(Product)
    private productRepository: Repository<Product>,
    @InjectRepository(Promotion)
    private promotionRepository: Repository<Promotion>,
  ) {}

  async getCart(userId: string) {
    const items = await this.cartItemRepository.find({
      where: { user_id: userId },
      relations: ['product', 'product.images', 'product_variant'],
    });

    const subtotal = items.reduce((sum, item) => {
      return sum + parseFloat(item.product.price.toString()) * item.quantity;
    }, 0);

    return {
      items,
      summary: {
        subtotal,
        itemsCount: items.length,
      },
    };
  }

  async addItem(userId: string, data: any) {
    const product = await this.productRepository.findOne({ where: { id: data.product_id } });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    const existingItem = await this.cartItemRepository.findOne({
      where: {
        user_id: userId,
        product_id: data.product_id,
        product_variant_id: data.product_variant_id || null,
      },
    });

    if (existingItem) {
      existingItem.quantity += data.quantity || 1;
      await this.cartItemRepository.save(existingItem);
      return { message: 'Cart updated', item: existingItem };
    }

    const cartItem = this.cartItemRepository.create({
      id: IdGenerator.generate('cart'),
      user_id: userId,
      product_id: data.product_id,
      product_variant_id: data.product_variant_id,
      quantity: data.quantity || 1,
    });

    await this.cartItemRepository.save(cartItem);
    return { message: 'Item added to cart', item: cartItem };
  }

  async updateItem(userId: string, itemId: string, quantity: number) {
    const item = await this.cartItemRepository.findOne({
      where: { id: itemId, user_id: userId },
    });

    if (!item) {
      throw new NotFoundException('Cart item not found');
    }

    item.quantity = quantity;
    await this.cartItemRepository.save(item);

    return { message: 'Cart item updated', item };
  }

  async removeItem(userId: string, itemId: string) {
    const result = await this.cartItemRepository.delete({
      id: itemId,
      user_id: userId,
    });

    if (result.affected === 0) {
      throw new NotFoundException('Cart item not found');
    }

    return { message: 'Item removed from cart' };
  }

  async applyCoupon(userId: string, code: string) {
    const promotion = await this.promotionRepository.findOne({
      where: { code, status: 'Active' },
    });

    if (!promotion) {
      return { valid: false, message: 'Invalid coupon code' };
    }

    // Check expiry
    if (promotion.expiry_date && new Date(promotion.expiry_date) < new Date()) {
      return { valid: false, message: 'Coupon has expired' };
    }

    return {
      valid: true,
      promotion: {
        code: promotion.code,
        type: promotion.type,
        discount_value: promotion.discount_value,
        min_order_value: promotion.min_order_value,
      },
    };
  }
}
