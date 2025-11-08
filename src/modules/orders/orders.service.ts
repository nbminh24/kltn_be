import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Order } from '../../entities/order.entity';
import { OrderItem } from '../../entities/order-item.entity';
import { Cart } from '../../entities/cart.entity';
import { CartItem } from '../../entities/cart-item.entity';
import { Customer } from '../../entities/customer.entity';
import { ProductVariant } from '../../entities/product-variant.entity';

@Injectable()
export class OrdersService {
  constructor(
    @InjectRepository(Order)
    private orderRepository: Repository<Order>,
    @InjectRepository(OrderItem)
    private orderItemRepository: Repository<OrderItem>,
    @InjectRepository(Cart)
    private cartRepository: Repository<Cart>,
    @InjectRepository(CartItem)
    private cartItemRepository: Repository<CartItem>,
    @InjectRepository(Customer)
    private customerRepository: Repository<Customer>,
    @InjectRepository(ProductVariant)
    private variantRepository: Repository<ProductVariant>,
  ) {}

  async createOrder(customerId: number, orderData: any) {
    // Get customer's cart
    const cart = await this.cartRepository.findOne({
      where: { customer_id: customerId },
      relations: ['items', 'items.variant', 'items.variant.product'],
    });

    if (!cart || cart.items.length === 0) {
      throw new BadRequestException('Cart is empty');
    }

    const customer = await this.customerRepository.findOne({ where: { id: customerId } });

    // Calculate totals
    const subtotal = cart.items.reduce((sum, item) => {
      return sum + parseFloat((item.variant.product as any).selling_price?.toString() || '0') * item.quantity;
    }, 0);

    const shipping_fee = orderData.shipping_fee || 0;
    const total_amount = subtotal + shipping_fee;

    const order = this.orderRepository.create({
      customer_id: customerId,
      customer_email: customer?.email || orderData.customer_email,
      shipping_address: orderData.shipping_address,
      shipping_phone: orderData.shipping_phone,
      payment_method: orderData.payment_method || 'cod',
      payment_status: 'unpaid',
      fulfillment_status: 'pending',
      shipping_fee,
      total_amount,
    });

    await this.orderRepository.save(order);

    // Create order items
    for (const cartItem of cart.items) {
      const orderItem = this.orderItemRepository.create({
        order_id: order.id,
        variant_id: cartItem.variant_id,
        quantity: cartItem.quantity,
        price_at_purchase: parseFloat((cartItem.variant.product as any).selling_price?.toString() || '0'),
      });

      await this.orderItemRepository.save(orderItem);
    }

    // Clear cart
    await this.cartItemRepository.delete({ cart_id: cart.id });

    return { message: 'Order created successfully', order };
  }

  async getUserOrders(customerId: number, query: any) {
    const { page = 1, limit = 10 } = query;
    const skip = (page - 1) * limit;

    const [orders, total] = await this.orderRepository.findAndCount({
      where: { customer_id: customerId },
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

  async getOrderById(customerId: number, orderId: number) {
    const order = await this.orderRepository.findOne({
      where: { id: orderId, customer_id: customerId },
      relations: ['items', 'items.variant'],
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    return { order };
  }

  async cancelOrder(customerId: number, orderId: number) {
    const order = await this.orderRepository.findOne({
      where: { id: orderId, customer_id: customerId },
      relations: ['items'],
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (order.fulfillment_status !== 'pending' && order.fulfillment_status !== 'confirmed') {
      throw new BadRequestException('Cannot cancel this order at current status');
    }

    order.fulfillment_status = 'cancelled';
    await this.orderRepository.save(order);

    return { message: 'Order cancelled successfully' };
  }
}
