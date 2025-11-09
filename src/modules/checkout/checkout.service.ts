import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { Order } from '../../entities/order.entity';
import { OrderItem } from '../../entities/order-item.entity';
import { Cart } from '../../entities/cart.entity';
import { CartItem } from '../../entities/cart-item.entity';
import { CustomerAddress } from '../../entities/customer-address.entity';
import { ProductVariant } from '../../entities/product-variant.entity';
import { CreateOrderDto } from './dto/create-order.dto';

@Injectable()
export class CheckoutService {
  constructor(
    @InjectRepository(Order)
    private orderRepository: Repository<Order>,
    @InjectRepository(OrderItem)
    private orderItemRepository: Repository<OrderItem>,
    @InjectRepository(Cart)
    private cartRepository: Repository<Cart>,
    @InjectRepository(CartItem)
    private cartItemRepository: Repository<CartItem>,
    @InjectRepository(CustomerAddress)
    private addressRepository: Repository<CustomerAddress>,
    @InjectRepository(ProductVariant)
    private variantRepository: Repository<ProductVariant>,
    private dataSource: DataSource,
  ) {}

  /**
   * UC-C11: Create order from cart with transaction
   */
  async createOrder(customerId: number, dto: CreateOrderDto) {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 1. Get cart and items
      const cart = await queryRunner.manager.findOne(Cart, {
        where: { customer_id: customerId },
      });

      if (!cart) {
        throw new BadRequestException('Giỏ hàng trống');
      }

      const cartItems = await queryRunner.manager.find(CartItem, {
        where: { cart_id: cart.id },
        relations: ['variant', 'variant.product'],
      });

      if (!cartItems.length) {
        throw new BadRequestException('Giỏ hàng trống');
      }

      // 2. Get shipping address
      const address = await queryRunner.manager.findOne(CustomerAddress, {
        where: { id: dto.customer_address_id, customer_id: customerId },
      });

      if (!address) {
        throw new NotFoundException('Không tìm thấy địa chỉ giao hàng');
      }

      // 3. Check stock for all items
      for (const item of cartItems) {
        const variant = await queryRunner.manager.findOne(ProductVariant, {
          where: { id: item.variant_id },
        });

        const availableStock = variant.total_stock - variant.reserved_stock;
        if (availableStock < item.quantity) {
          throw new BadRequestException(
            `Sản phẩm "${variant.name || item.variant.product.name}" không đủ hàng. Chỉ còn ${availableStock} sản phẩm.`,
          );
        }
      }

      // 4. Calculate total amount
      let subtotal = 0;
      for (const item of cartItems) {
        const price = parseFloat(item.variant.product.selling_price?.toString() || '0');
        subtotal += price * item.quantity;
      }

      const shippingFee = dto.shipping_fee || 0;
      const totalAmount = subtotal + shippingFee;

      // 5. Create order
      const order = queryRunner.manager.create(Order, {
        customer_id: customerId,
        shipping_address: address.detailed_address,
        shipping_phone: address.phone_number,
        total_amount: totalAmount,
        shipping_fee: shippingFee,
        payment_method: dto.payment_method,
        payment_status: 'unpaid',
        fulfillment_status: 'pending',
      });

      const savedOrder = await queryRunner.manager.save(Order, order);

      // 6. Create order items and update stock
      for (const item of cartItems) {
        const variant = item.variant;
        const sellingPrice = parseFloat(variant.product.selling_price?.toString() || '0');

        // Create order item
        const orderItem = queryRunner.manager.create(OrderItem, {
          order_id: savedOrder.id,
          variant_id: item.variant_id,
          quantity: item.quantity,
          price_at_purchase: sellingPrice,
        });

        await queryRunner.manager.save(OrderItem, orderItem);

        // Update stock (reserve stock)
        await queryRunner.manager.update(
          ProductVariant,
          { id: item.variant_id },
          {
            reserved_stock: () => `reserved_stock + ${item.quantity}`,
          },
        );
      }

      // 7. Clear cart
      await queryRunner.manager.delete(CartItem, { cart_id: cart.id });

      // Commit transaction
      await queryRunner.commitTransaction();

      return {
        message: 'Đơn hàng đã được tạo thành công',
        order: savedOrder,
      };
    } catch (error) {
      // Rollback on error
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      // Release query runner
      await queryRunner.release();
    }
  }
}
