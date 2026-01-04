import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
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
import { DeliveryEstimationService } from './delivery-estimation.service';

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
    private deliveryEstimationService: DeliveryEstimationService,
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
      return (
        sum +
        parseFloat((item.variant.product as any).selling_price?.toString() || '0') * item.quantity
      );
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
        price_at_purchase: parseFloat(
          (cartItem.variant.product as any).selling_price?.toString() || '0',
        ),
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
        thumbnail_url:
          item.variant?.product?.thumbnail_url || item.variant?.images?.[0]?.image_url || null,
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

  async cancelOrder(customerId: number, orderId: number, cancelReason: string) {
    const order = await this.orderRepository.findOne({
      where: { id: orderId, customer_id: customerId },
      relations: ['items'],
    });

    if (!order) {
      throw new NotFoundException({
        success: false,
        error: 'ORDER_NOT_FOUND',
        message: `Order #${orderId} not found`,
        suggestion: null,
      });
    }

    const validReasons = [
      'changed_mind',
      'ordered_wrong_item',
      'wrong_size_color',
      'found_better_price',
      'delivery_too_slow',
      'payment_issue',
      'duplicate_order',
      'other',
    ];

    if (!validReasons.includes(cancelReason)) {
      throw new BadRequestException({
        success: false,
        error: 'INVALID_CANCEL_REASON',
        message: 'Invalid cancellation reason provided',
        valid_reasons: validReasons,
      });
    }

    const status = order.fulfillment_status;

    if (status === 'cancelled') {
      throw new BadRequestException({
        success: false,
        error: 'ALREADY_CANCELLED',
        message: 'This order has already been cancelled',
        current_status: 'cancelled',
        cancelled_at: order.cancelled_at,
        suggestion: null,
      });
    }

    if (status === 'confirmed') {
      throw new BadRequestException({
        success: false,
        error: 'CANNOT_CANCEL_CONFIRMED',
        message: 'This order has been confirmed and is waiting for delivery',
        current_status: 'confirmed',
        suggestion:
          'You can refuse the package upon delivery or request a return after receiving it, according to our return policy',
      });
    }

    if (status === 'shipping' || status === 'shipped') {
      throw new BadRequestException({
        success: false,
        error: 'CANNOT_CANCEL_SHIPPING',
        message: 'This order is currently being shipped',
        current_status: status,
        tracking_number: order.tracking_number || null,
        carrier: order.carrier_name || null,
        suggestion:
          'A common option is to refuse the delivery when the courier arrives, or initiate a return after the package is delivered',
      });
    }

    if (status === 'delivered') {
      throw new BadRequestException({
        success: false,
        error: 'CANNOT_CANCEL_DELIVERED',
        message: 'This order has already been delivered',
        current_status: 'delivered',
        delivered_at: order.actual_delivery_date,
        suggestion:
          'You may request a return or refund according to our return policy if the product meets the conditions',
      });
    }

    if (status !== 'pending') {
      throw new BadRequestException({
        success: false,
        error: 'CANNOT_CANCEL',
        message: `Cannot cancel order in ${status} status`,
        current_status: status,
        suggestion: 'Please contact support for assistance',
      });
    }

    order.fulfillment_status = 'cancelled';
    order.cancelled_at = new Date();
    order.cancel_reason = cancelReason;
    order.cancelled_by_customer_id = customerId;
    order.refund_status = order.payment_status === 'paid' ? 'pending' : 'not_applicable';
    order.refund_amount = order.payment_status === 'paid' ? order.total_amount : null;

    await this.orderRepository.save(order);

    this.logger.log(
      `✅ Order #${order.order_number} cancelled by customer ${customerId}. Reason: ${cancelReason}`,
    );

    return {
      success: true,
      message: 'Order cancelled successfully',
      order: {
        order_id: order.id,
        order_number: order.order_number,
        fulfillment_status: order.fulfillment_status,
        cancelled_at: order.cancelled_at,
        cancel_reason: order.cancel_reason,
        refund_status: order.refund_status,
        refund_amount: order.refund_amount,
      },
    };
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
        relations: [
          'items',
          'items.variant',
          'items.variant.product',
          'items.variant.size',
          'items.variant.color',
        ],
      });
    }

    // Try order_number
    if (!order) {
      order = await this.orderRepository.findOne({
        where: { order_number: orderIdStr },
        relations: [
          'items',
          'items.variant',
          'items.variant.product',
          'items.variant.size',
          'items.variant.color',
        ],
      });
    }

    // Try with # prefix
    if (!order && !orderIdStr.startsWith('#')) {
      order = await this.orderRepository.findOne({
        where: { order_number: `#${orderIdStr}` },
        relations: [
          'items',
          'items.variant',
          'items.variant.product',
          'items.variant.size',
          'items.variant.color',
        ],
      });
    }

    if (!order) {
      throw new NotFoundException('Không tìm thấy đơn hàng');
    }

    // 🚨 CRITICAL: Verify ownership
    if (order.customer_id !== authenticatedCustomerId) {
      this.logger.warn(
        `[SECURITY] Customer ${authenticatedCustomerId} attempted to access order ${order.order_number} belonging to customer ${order.customer_id}`,
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

  async getDeliveryEstimation(query: any, authHeader?: string) {
    const { order_id } = query;

    if (!order_id) {
      throw new BadRequestException('Order ID is required');
    }

    const authenticatedCustomerId = this.extractCustomerIdFromJWT(authHeader);

    if (!authenticatedCustomerId) {
      throw new BadRequestException('Authentication required');
    }

    let order: Order | null = null;
    const orderIdStr = order_id.toString().replace(/^#/, '');

    const parsedId = parseInt(orderIdStr);
    if (!isNaN(parsedId)) {
      order = await this.orderRepository.findOne({
        where: { id: parsedId },
      });
    }

    if (!order) {
      order = await this.orderRepository.findOne({
        where: { order_number: orderIdStr },
      });
    }

    if (!order && !orderIdStr.startsWith('#')) {
      order = await this.orderRepository.findOne({
        where: { order_number: `#${orderIdStr}` },
      });
    }

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (order.customer_id !== authenticatedCustomerId) {
      this.logger.warn(
        `[SECURITY] Customer ${authenticatedCustomerId} attempted to access delivery estimation for order ${order.order_number} belonging to customer ${order.customer_id}`,
      );
      throw new NotFoundException('Order not found');
    }

    const status = order.fulfillment_status;

    if (status === 'pending' || status === 'confirmed' || status === 'processing') {
      return {
        order_id: order.id,
        order_number: order.order_number,
        status: status,
        estimated_delivery: null,
        message: this.deliveryEstimationService.getDeliveryStatusMessage(status),
      };
    }

    if (status === 'delivered' && order.actual_delivery_date) {
      return {
        order_id: order.id,
        order_number: order.order_number,
        status: 'delivered',
        estimated_delivery: {
          actual_date: order.actual_delivery_date,
          formatted: new Date(order.actual_delivery_date).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          }),
        },
        message: `Your order was delivered on ${new Date(order.actual_delivery_date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}.`,
      };
    }

    if (status === 'cancelled') {
      return {
        order_id: order.id,
        order_number: order.order_number,
        status: 'cancelled',
        estimated_delivery: null,
        message: 'This order has been cancelled.',
      };
    }

    const location = {
      city: order.shipping_city || '',
      district: order.shipping_district || '',
    };

    const isMajorCity = this.deliveryEstimationService.isMajorCity(location.city);

    const deliveryEstimate = this.deliveryEstimationService.estimateDeliveryDate(
      order.created_at,
      order.shipping_method || 'standard',
      location,
    );

    return {
      order_id: order.id,
      order_number: order.order_number,
      status: status,
      shipping_method: order.shipping_method || 'standard',
      destination: {
        city: order.shipping_city,
        district: order.shipping_district,
        is_major_city: isMajorCity,
      },
      estimated_delivery: deliveryEstimate,
      tracking_url: order.tracking_number
        ? `https://tracking.example.com/${order.tracking_number}`
        : null,
      delivery_status_message: this.deliveryEstimationService.getDeliveryStatusMessage(status),
    };
  }
}
