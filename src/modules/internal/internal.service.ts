import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like } from 'typeorm';
import { Order } from '../../entities/order.entity';
import { Product } from '../../entities/product.entity';
import { StaticPage } from '../../entities/static-page.entity';
import { User } from '../../entities/user.entity';

@Injectable()
export class InternalService {
  constructor(
    @InjectRepository(Order)
    private orderRepository: Repository<Order>,
    @InjectRepository(Product)
    private productRepository: Repository<Product>,
    @InjectRepository(StaticPage)
    private staticPageRepository: Repository<StaticPage>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  async getOrderById(orderId: string) {
    const order = await this.orderRepository.findOne({
      where: { id: orderId },
      relations: ['items', 'items.product', 'user'],
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    return {
      order: {
        id: order.id,
        status: order.status,
        total: order.total,
        order_date: order.order_date,
        tracking_number: order.tracking_number,
        shipping_address: order.shipping_address,
        items: order.items.map(item => ({
          product_name: item.product_name,
          quantity: item.quantity,
          price: item.price,
        })),
      },
    };
  }

  async searchProducts(query: string, limit: number = 10) {
    const products = await this.productRepository.find({
      where: [
        { name: Like(`%${query}%`) },
        { description: Like(`%${query}%`) },
        { sku: Like(`%${query}%`) },
      ],
      relations: ['category', 'images'],
      take: limit,
    });

    return {
      products: products.map(p => ({
        id: p.id,
        name: p.name,
        price: p.price,
        category: p.category?.name,
        image: p.images?.[0]?.image_url,
        slug: p.slug,
      })),
      count: products.length,
    };
  }

  async searchFaq(query: string) {
    const pages = await this.staticPageRepository.find({
      where: [
        { slug: Like(`%${query}%`) },
        { title: Like(`%${query}%`) },
        { content: Like(`%${query}%`) },
      ],
      take: 5,
    });

    return {
      results: pages.map(p => ({
        slug: p.slug,
        title: p.title,
        content: p.content.substring(0, 500), // Truncate for performance
      })),
      count: pages.length,
    };
  }

  async getUserByEmail(email: string) {
    const user = await this.userRepository.findOne({
      where: { email },
      select: ['id', 'name', 'email', 'phone', 'orders_count', 'total_spent'],
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return { user };
  }
}
