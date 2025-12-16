import { Injectable, NotFoundException, BadRequestException, ForbiddenException, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { Order } from '../../entities/order.entity';
import { OrderItem } from '../../entities/order-item.entity';
import { Cart } from '../../entities/cart.entity';
import { CartItem } from '../../entities/cart-item.entity';
import { Customer } from '../../entities/customer.entity';
import { ProductVariant } from '../../entities/product-variant.entity';
import { OrderStatusHistory } from '../../entities/order-status-history.entity';

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

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
    @InjectRepository(OrderStatusHistory)
    private statusHistoryRepository: Repository<OrderStatusHistory>,
    private jwtService: JwtService,
  ) { }

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
      relations: [
        'items',
        'items.variant',
        'items.variant.size',
        'items.variant.color',
        'items.variant.product',
        'items.variant.images',
      ],
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (order.items) {
      order.items = order.items.map(item => ({
        ...item,
        product_name: item.variant?.product?.name || item.variant?.name || 'N/A',
        thumbnail_url: item.variant?.product?.thumbnail_url || item.variant?.images?.[0]?.image_url || null,
      })) as any;
    }

    return { order };
  }

  async getStatusHistory(customerId: number, orderId: number) {
    // Verify order belongs to customer
    const order = await this.orderRepository.findOne({
      where: { id: orderId, customer_id: customerId },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    // Get status history timeline
    const history = await this.statusHistoryRepository.find({
      where: { order_id: orderId },
      relations: ['admin'],
      order: { created_at: 'ASC' },
    });

    return {
      order: {
        id: order.id,
        fulfillment_status: order.fulfillment_status,
        payment_status: order.payment_status,
      },
      timeline: history,
    };
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

  private extractCustomerIdFromJWT(authHeader?: string): number | undefined {
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return undefined;
    }

    try {
      const token = authHeader.substring(7);
      const decoded = this.jwtService.verify(token);
      const customerId = decoded.sub || decoded.customerId;

      if (customerId) {
        return Number(customerId);
      }
    } catch (error) {
      this.logger.warn(`⚠️ Failed to decode JWT: ${error.message}`);
    }

    return undefined;
  }

  async trackOrder(query: any, authHeader?: string) {
    const { order_id } = query;

    if (!order_id) {
      throw new BadRequestException('Phải cung cấp order_id');
    }

    // Extract customer_id from JWT
    const authenticatedCustomerId = this.extractCustomerIdFromJWT(authHeader);

    if (!authenticatedCustomerId) {
      throw new BadRequestException('Yêu cầu đăng nhập để track order');
    }

    // Find order with flexible lookup
    let order: Order | null = null;
    const orderIdStr = order_id.toString().replace(/^#/, '');

    // Try numeric ID first
    const parsedId = parseInt(orderIdStr);
    if (!isNaN(parsedId)) {
      order = await this.orderRepository.findOne({
        where: { id: parsedId },
        relations: ['items', 'items.variant', 'items.variant.product', 'items.variant.size', 'items.variant.color'],
      });
    }

    // Try order_number
    if (!order) {
      order = await this.orderRepository.findOne({
        where: { order_number: orderIdStr },
        relations: ['items', 'items.variant', 'items.variant.product', 'items.variant.size', 'items.variant.color'],
      });
    }

    // Try with # prefix
    if (!order && !orderIdStr.startsWith('#')) {
      order = await this.orderRepository.findOne({
        where: { order_number: `#${orderIdStr}` },
        relations: ['items', 'items.variant', 'items.variant.product', 'items.variant.size', 'items.variant.color'],
      });
    }

    if (!order) {
      throw new NotFoundException('Không tìm thấy đơn hàng');
    }

    // 🚨 CRITICAL: Verify ownership
    if (order.customer_id !== authenticatedCustomerId) {
      this.logger.warn(
        `[SECURITY] Customer ${authenticatedCustomerId} attempted to access order ${order.order_number} belonging to customer ${order.customer_id}`
      );
      throw new ForbiddenException('Bạn không có quyền xem đơn hàng này');
    }

    // Return with field aliases for chatbot compatibility
    return {
      order_id: order.id,
      order_number: order.order_number,
      customer_id: order.customer_id,

      // ✅ Field aliases for chatbot (Bug #2 fix)
      status: order.fulfillment_status,
      total: order.total_amount,
      date: order.created_at,

      // Detailed fields
      fulfillment_status: order.fulfillment_status,
      payment_status: order.payment_status,
      total_amount: order.total_amount,
      shipping_fee: order.shipping_fee,
      shipping_address: order.shipping_address,
      shipping_phone: order.shipping_phone,
      created_at: order.created_at,
      updated_at: order.updated_at,

      items: order.items.map(item => ({
        product_id: item.variant?.product?.id,
        product_name: item.variant?.product?.name || 'N/A',
        variant_id: item.variant_id,
        size: item.variant?.size?.name,
        color: item.variant?.color?.name,
        quantity: item.quantity,
        price: item.price_at_purchase,
        subtotal: item.quantity * item.price_at_purchase,
      })),
    };
  }
}
