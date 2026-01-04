import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Order } from '../../entities/order.entity';
import { OrderItem } from '../../entities/order-item.entity';
import { ProductVariant } from '../../entities/product-variant.entity';
import { Product } from '../../entities/product.entity';
import { Review } from '../../entities/review.entity';
import { SupportTicket } from '../../entities/support-ticket.entity';

@Injectable()
export class AnalyticsService {
  constructor(
    @InjectRepository(Order)
    private orderRepository: Repository<Order>,
    @InjectRepository(OrderItem)
    private orderItemRepository: Repository<OrderItem>,
    @InjectRepository(ProductVariant)
    private variantRepository: Repository<ProductVariant>,
    @InjectRepository(Product)
    private productRepository: Repository<Product>,
    @InjectRepository(Review)
    private reviewRepository: Repository<Review>,
    @InjectRepository(SupportTicket)
    private ticketRepository: Repository<SupportTicket>,
  ) {}

  // Dashboard KPIs
  async getDashboardStats(period: string = '7d') {
    const days = parseInt(period.replace('d', ''));
    const now = new Date();
    const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
    const previousStartDate = new Date(now.getTime() - 2 * days * 24 * 60 * 60 * 1000);

    // Current period stats
    const currentStats = await this.orderRepository
      .createQueryBuilder('o')
      .select('SUM(o.total_amount)', 'revenue')
      .addSelect('COUNT(o.id)', 'orders')
      .addSelect('AVG(o.total_amount)', 'avgOrder')
      .where('o.created_at >= :startDate', { startDate })
      .andWhere('o.payment_status = :status', { status: 'paid' })
      .getRawOne();

    // Previous period stats
    const previousStats = await this.orderRepository
      .createQueryBuilder('o')
      .select('SUM(o.total_amount)', 'revenue')
      .addSelect('COUNT(o.id)', 'orders')
      .addSelect('AVG(o.total_amount)', 'avgOrder')
      .where('o.created_at >= :previousStartDate', { previousStartDate })
      .andWhere('o.created_at < :startDate', { startDate })
      .andWhere('o.payment_status = :status', { status: 'paid' })
      .getRawOne();

    // AI Escalated count (if you have ai_escalated field)
    const aiEscalated = await this.ticketRepository.count({
      where: { created_at: startDate as any, source: 'chatbot' },
    });

    const calcChange = (current: number, previous: number) => {
      if (!previous) return 100;
      return ((current - previous) / previous) * 100;
    };

    return {
      totalRevenue: {
        value: parseFloat(currentStats.revenue) || 0,
        change: calcChange(currentStats.revenue, previousStats.revenue),
      },
      newOrders: {
        value: parseInt(currentStats.orders) || 0,
        change: calcChange(currentStats.orders, previousStats.orders),
      },
      avgOrderValue: {
        value: parseFloat(currentStats.avgOrder) || 0,
        change: calcChange(currentStats.avgOrder, previousStats.avgOrder),
      },
      aiEscalated: {
        value: aiEscalated,
        change: 0, // Calculate if needed
      },
    };
  }

  // Sales overview chart
  async getSalesOverview(period: string = '30d') {
    const days = parseInt(period.replace('d', ''));
    const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const salesData = await this.orderRepository
      .createQueryBuilder('o')
      .select("DATE_TRUNC('day', o.created_at)", 'date')
      .addSelect('SUM(o.total_amount)', 'daily_revenue')
      .where('o.created_at >= :startDate', { startDate })
      .andWhere('o.payment_status = :status', { status: 'paid' })
      .groupBy("DATE_TRUNC('day', o.created_at)")
      .orderBy("DATE_TRUNC('day', o.created_at)", 'ASC')
      .getRawMany();

    return {
      data: salesData.map(row => ({
        date: row.date.toISOString().split('T')[0],
        daily_revenue: parseFloat(row.daily_revenue) || 0,
      })),
    };
  }

  // Product analytics
  async getProductAnalytics(productId: number) {
    const stats = await this.orderItemRepository
      .createQueryBuilder('oi')
      .innerJoin('oi.variant', 'v')
      .innerJoin('oi.order', 'o')
      .select('SUM(oi.quantity)', 'unitsSold')
      .addSelect('COUNT(DISTINCT oi.order_id)', 'totalOrders')
      .where('v.product_id = :productId', { productId })
      .andWhere('o.payment_status = :status', { status: 'paid' })
      .getRawOne();

    const product = await this.productRepository.findOne({
      where: { id: productId },
      select: ['average_rating', 'total_reviews'],
    });

    return {
      unitsSold: parseInt(stats.unitsSold) || 0,
      totalOrders: parseInt(stats.totalOrders) || 0,
      avgRating: product?.average_rating || 0,
      totalReviews: product?.total_reviews || 0,
    };
  }

  // Variant sales distribution
  async getVariantSales(productId: number) {
    const variantSales = await this.orderItemRepository
      .createQueryBuilder('oi')
      .innerJoin('oi.variant', 'v')
      .select('v.name', 'variantName')
      .addSelect('SUM(oi.quantity)', 'totalSold')
      .where('v.product_id = :productId', { productId })
      .groupBy('v.id, v.name')
      .orderBy('SUM(oi.quantity)', 'DESC')
      .getRawMany();

    return {
      data: variantSales.map(row => ({
        variantName: row.variantName,
        totalSold: parseInt(row.totalSold),
      })),
    };
  }

  // Rating distribution
  async getRatingDistribution(productId: number) {
    const distribution = await this.reviewRepository
      .createQueryBuilder('r')
      .innerJoin('r.variant', 'v')
      .select('r.rating', 'rating')
      .addSelect('COUNT(*)', 'count')
      .where('v.product_id = :productId', { productId })
      .andWhere('r.status = :status', { status: 'approved' })
      .groupBy('r.rating')
      .orderBy('r.rating', 'DESC')
      .getRawMany();

    return {
      data: distribution.map(row => ({
        rating: row.rating,
        count: parseInt(row.count),
      })),
    };
  }

  // Order status counts
  async getOrderStatusCounts() {
    const statusCounts = await this.orderRepository
      .createQueryBuilder('o')
      .select('o.fulfillment_status', 'status')
      .addSelect('COUNT(*)', 'count')
      .groupBy('o.fulfillment_status')
      .getRawMany();

    const totalOrders = await this.orderRepository.count();

    const result: any = { totalOrders };

    statusCounts.forEach(row => {
      result[row.status.toLowerCase()] = parseInt(row.count);
    });

    return result;
  }

  // Inventory stats
  async getInventoryStats() {
    const totalProducts = await this.productRepository.count({
      where: { status: 'active' },
    });

    const lowStockItems = await this.variantRepository
      .createQueryBuilder('v')
      .where('v.total_stock > 0')
      .andWhere('v.total_stock < v.reorder_point')
      .getCount();

    const outOfStockItems = await this.variantRepository.count({
      where: { total_stock: 0 },
    });

    const stockValue = await this.variantRepository
      .createQueryBuilder('v')
      .innerJoin('v.product', 'p')
      .select('SUM(v.total_stock * p.cost_price)', 'totalValue')
      .getRawOne();

    return {
      totalProducts,
      lowStockItems,
      outOfStockItems,
      totalStockValue: parseFloat(stockValue.totalValue) || 0,
    };
  }

  // Support ticket status counts
  async getSupportTicketStatusCounts() {
    const statusCounts = await this.ticketRepository
      .createQueryBuilder('t')
      .select('t.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .groupBy('t.status')
      .getRawMany();

    const aiEscalated = await this.ticketRepository.count({
      where: { source: 'chatbot' },
    });

    const result: any = { aiEscalated };

    statusCounts.forEach(row => {
      result[row.status] = parseInt(row.count);
    });

    return result;
  }
}
