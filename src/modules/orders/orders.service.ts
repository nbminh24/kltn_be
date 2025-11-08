import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Order } from '../../entities/order.entity';
import { OrderItem } from '../../entities/order-item.entity';
import { CartItem } from '../../entities/cart-item.entity';
import { User } from '../../entities/user.entity';
import { Product } from '../../entities/product.entity';
import { ProductVariant } from '../../entities/product-variant.entity';
import { IdGenerator } from '../../common/utils/id-generator';

@Injectable()
export class OrdersService {
  constructor(
    @InjectRepository(Order)
    private orderRepository: Repository<Order>,
    @InjectRepository(OrderItem)
    private orderItemRepository: Repository<OrderItem>,
    @InjectRepository(CartItem)
    private cartItemRepository: Repository<CartItem>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Product)
    private productRepository: Repository<Product>,
    @InjectRepository(ProductVariant)
    private variantRepository: Repository<ProductVariant>,
  ) {}

  async createOrder(userId: string, orderData: any) {
    // Get cart items
    const cartItems = await this.cartItemRepository.find({
      where: { user_id: userId },
      relations: ['product', 'product.images'],
    });

    if (cartItems.length === 0) {
      throw new BadRequestException('Cart is empty');
    }

    // Calculate totals
    const subtotal = cartItems.reduce((sum, item) => {
      return sum + parseFloat(item.product.price.toString()) * item.quantity;
    }, 0);

    const order = this.orderRepository.create({
      id: IdGenerator.generate('order'),
      user_id: userId,
      subtotal,
      discount: orderData.discount || 0,
      promo_code: orderData.promo_code || null,
      delivery_fee: orderData.delivery_fee || 0,
      total: subtotal - (orderData.discount || 0) + (orderData.delivery_fee || 0),
      payment_method: orderData.payment_method,
      payment_status: 'Pending',
      shipping_name: orderData.shipping_name,
      shipping_phone: orderData.shipping_phone,
      shipping_address: orderData.shipping_address,
      shipping_city: orderData.shipping_city,
      shipping_state: orderData.shipping_state || null,
      shipping_postal_code: orderData.shipping_postal_code,
      tracking_number: null,
      delivered_date: null,
    });

    await this.orderRepository.save(order);

    // Create order items
    for (const cartItem of cartItems) {
      const orderItem = this.orderItemRepository.create({
        id: IdGenerator.generate('item'),
        order_id: order.id,
        product_id: cartItem.product_id,
        product_variant_id: cartItem.product_variant_id || null,
        product_name: cartItem.product.name,
        product_image: cartItem.product.images?.[0]?.image_url,
        size: cartItem.product_variant?.size || null,
        color: cartItem.product_variant?.color || null,
        price: cartItem.product.price,
        quantity: cartItem.quantity,
        subtotal: parseFloat(cartItem.product.price.toString()) * cartItem.quantity,
      });

      await this.orderItemRepository.save(orderItem);

      // Reduce stock for variant or product
      if (cartItem.product_variant_id) {
        await this.variantRepository.decrement(
          { id: cartItem.product_variant_id },
          'stock',
          cartItem.quantity,
        );
      }

      // Increase sold_count for product
      await this.productRepository.increment(
        { id: cartItem.product_id },
        'sold_count',
        cartItem.quantity,
      );
    }

    // Clear cart
    await this.cartItemRepository.delete({ user_id: userId });

    return { message: 'Order created successfully', order };
  }

  async getUserOrders(userId: string, query: any) {
    const { page = 1, limit = 10 } = query;
    const skip = (page - 1) * limit;

    const [orders, total] = await this.orderRepository.findAndCount({
      where: { user_id: userId },
      relations: ['items'],
      order: { created_at: 'DESC' },
      skip,
      take: limit,
    });

    return {
      orders,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getOrderById(userId: string, orderId: string) {
    const order = await this.orderRepository.findOne({
      where: { id: orderId, user_id: userId },
      relations: ['items', 'items.product'],
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    return { order };
  }

  async cancelOrder(userId: string, orderId: string) {
    const order = await this.orderRepository.findOne({
      where: { id: orderId, user_id: userId },
      relations: ['items'],
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (order.status !== 'Pending' && order.status !== 'Confirmed') {
      throw new BadRequestException('Cannot cancel this order at current status');
    }

    // Restore stock if order had stock reduced
    for (const item of order.items) {
      if (item.product_variant_id) {
        await this.variantRepository.increment(
          { id: item.product_variant_id },
          'stock',
          item.quantity,
        );
      }

      // Reduce sold_count
      await this.productRepository.decrement(
        { id: item.product_id },
        'sold_count',
        item.quantity,
      );
    }

    order.status = 'Cancelled';
    await this.orderRepository.save(order);

    return { message: 'Order cancelled successfully' };
  }
}
