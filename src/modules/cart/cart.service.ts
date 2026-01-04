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
      return (
        sum +
        parseFloat((item.variant.product as any).selling_price?.toString() || '0') * item.quantity
      );
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

    // Check if variant exists and is active
    const variant = await this.variantRepository.findOne({
      where: { id: data.variant_id, status: 'active' },
    });
    if (!variant) {
      throw new NotFoundException('Product variant not found');
    }

    // Check stock availability (UC-C10 requirement)
    const availableStock = variant.total_stock - variant.reserved_stock;
    if (availableStock < data.quantity) {
      throw new BadRequestException(`Không đủ hàng. Chỉ còn ${availableStock} sản phẩm.`);
    }

    // Check if item already in cart
    const existingItem = await this.cartItemRepository.findOne({
      where: {
        cart_id: cart.id,
        variant_id: data.variant_id,
      },
    });

    if (existingItem) {
      // Check stock for new total quantity
      const newQuantity = existingItem.quantity + data.quantity;
      if (availableStock < newQuantity) {
        throw new BadRequestException(`Không đủ hàng. Chỉ còn ${availableStock} sản phẩm.`);
      }
      existingItem.quantity = newQuantity;
      await this.cartItemRepository.save(existingItem);
      return { message: 'Đã thêm vào giỏ hàng thành công', item: existingItem };
    }

    const cartItem = this.cartItemRepository.create({
      cart_id: cart.id,
      variant_id: data.variant_id,
      quantity: data.quantity,
    });

    await this.cartItemRepository.save(cartItem);

    return { message: 'Đã thêm vào giỏ hàng thành công', item: cartItem };
  }

  async updateItem(customerId: number, itemId: number, quantity: number) {
    const cart = await this.getOrCreateCart(customerId);

    const item = await this.cartItemRepository.findOne({
      where: { id: itemId, cart_id: cart.id },
      relations: ['variant'],
    });

    if (!item) {
      throw new NotFoundException('Cart item not found');
    }

    // Check stock availability (UC-C10 requirement)
    const availableStock = item.variant.total_stock - item.variant.reserved_stock;
    if (availableStock < quantity) {
      throw new BadRequestException(`Không đủ hàng. Chỉ còn ${availableStock} sản phẩm.`);
    }

    item.quantity = quantity;
    await this.cartItemRepository.save(item);

    return { message: 'Cập nhật giỏ hàng thành công', item };
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

  async clearCart(customerId: number) {
    const cart = await this.getOrCreateCart(customerId);

    // Delete all cart items
    await this.cartItemRepository.delete({ cart_id: cart.id });

    return {
      message: 'Giỏ hàng đã được xóa',
      cart_id: cart.id,
    };
  }

  async mergeCart(customerId: number, sessionId: string) {
    // Get session cart
    const sessionCart = await this.cartRepository.findOne({
      where: { session_id: sessionId },
      relations: ['items'],
    });

    if (!sessionCart || sessionCart.items.length === 0) {
      return {
        message: 'Không có giỏ hàng session để merge',
        merged_count: 0,
      };
    }

    // Get or create customer cart
    const customerCart = await this.getOrCreateCart(customerId);

    // Merge items
    let mergedCount = 0;
    for (const item of sessionCart.items) {
      // Check if variant already exists in customer cart
      const existingItem = await this.cartItemRepository.findOne({
        where: {
          cart_id: customerCart.id,
          variant_id: item.variant_id,
        },
      });

      if (existingItem) {
        // Update quantity
        existingItem.quantity += item.quantity;
        await this.cartItemRepository.save(existingItem);
      } else {
        // Create new item
        const newItem = this.cartItemRepository.create({
          cart_id: customerCart.id,
          variant_id: item.variant_id,
          quantity: item.quantity,
        });
        await this.cartItemRepository.save(newItem);
      }
      mergedCount++;
    }

    // Delete session cart
    await this.cartItemRepository.delete({ cart_id: sessionCart.id });
    await this.cartRepository.delete({ id: sessionCart.id });

    return {
      message: 'Merge cart thành công',
      merged_count: mergedCount,
      customer_cart_id: customerCart.id,
    };
  }
}
