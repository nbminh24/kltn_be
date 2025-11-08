import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Cart } from '../../entities/cart.entity';
import { CartItem } from '../../entities/cart-item.entity';
import { ProductVariant } from '../../entities/product-variant.entity';

@Injectable()
export class CartService {
  constructor(
    @InjectRepository(Cart)
    private cartRepository: Repository<Cart>,
    @InjectRepository(CartItem)
    private cartItemRepository: Repository<CartItem>,
    @InjectRepository(ProductVariant)
    private variantRepository: Repository<ProductVariant>,
  ) {}

  async getOrCreateCart(customerId: number): Promise<Cart> {
    let cart = await this.cartRepository.findOne({
      where: { customer_id: customerId },
      relations: ['items', 'items.variant', 'items.variant.product'],
    });

    if (!cart) {
      cart = this.cartRepository.create({ customer_id: customerId });
      await this.cartRepository.save(cart);
    }

    return cart;
  }

  async getCart(customerId: number) {
    const cart = await this.getOrCreateCart(customerId);
    
    const items = await this.cartItemRepository.find({
      where: { cart_id: cart.id },
      relations: ['variant', 'variant.product', 'variant.size', 'variant.color'],
    });

    const subtotal = items.reduce((sum, item) => {
      return sum + parseFloat((item.variant.product as any).selling_price?.toString() || '0') * item.quantity;
    }, 0);

    return {
      items: items.map(item => ({
        id: item.id,
        variant_id: item.variant_id,
        quantity: item.quantity,
        variant: item.variant,
      })),
      subtotal,
      totalItems: items.length,
    };
  }

  async addItem(customerId: number, data: { variant_id: number; quantity: number }) {
    const cart = await this.getOrCreateCart(customerId);

    // Check if variant exists
    const variant = await this.variantRepository.findOne({ where: { id: data.variant_id } });
    if (!variant) {
      throw new NotFoundException('Product variant not found');
    }

    // Check if item already in cart
    const existingItem = await this.cartItemRepository.findOne({
      where: {
        cart_id: cart.id,
        variant_id: data.variant_id,
      },
    });

    if (existingItem) {
      existingItem.quantity += data.quantity;
      await this.cartItemRepository.save(existingItem);
      return { message: 'Cart updated', item: existingItem };
    }

    const cartItem = this.cartItemRepository.create({
      cart_id: cart.id,
      variant_id: data.variant_id,
      quantity: data.quantity,
    });

    await this.cartItemRepository.save(cartItem);

    return { message: 'Added to cart', item: cartItem };
  }

  async updateItem(customerId: number, itemId: number, quantity: number) {
    const cart = await this.getOrCreateCart(customerId);
    
    const item = await this.cartItemRepository.findOne({
      where: { id: itemId, cart_id: cart.id },
    });

    if (!item) {
      throw new NotFoundException('Cart item not found');
    }

    item.quantity = quantity;
    await this.cartItemRepository.save(item);

    return { message: 'Cart item updated', item };
  }

  async removeItem(customerId: number, itemId: number) {
    const cart = await this.getOrCreateCart(customerId);

    const result = await this.cartItemRepository.delete({
      id: itemId,
      cart_id: cart.id,
    });

    if (result.affected === 0) {
      throw new NotFoundException('Cart item not found');
    }

    return { message: 'Item removed from cart' };
  }

  async applyCoupon(customerId: number, code: string) {
    // TODO: Implement promotion logic
    throw new BadRequestException('Coupon feature not yet implemented');
  }
}
