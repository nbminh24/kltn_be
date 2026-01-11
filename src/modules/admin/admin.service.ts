import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThanOrEqual } from 'typeorm';
import { Order } from '../../entities/order.entity';
import { Product } from '../../entities/product.entity';
import { Category } from '../../entities/category.entity';
import { SupportTicket } from '../../entities/support-ticket.entity';
import { Page } from '../../entities/page.entity';
import { ProductVariant } from '../../entities/product-variant.entity';
import { ProductImage } from '../../entities/product-image.entity';
import { Promotion } from '../../entities/promotion.entity';
import { ChatSession } from '../../entities/chat-session.entity';
import { ChatMessage } from '../../entities/chat-message.entity';
import { AiRecommendation } from '../../entities/ai-recommendation.entity';
import { Customer } from '../../entities/customer.entity';
import { CustomerAddress } from '../../entities/customer-address.entity';
import { SupportTicketReply } from '../../entities/support-ticket-reply.entity';
import { RestockBatch } from '../../entities/restock-batch.entity';
import { RestockItem } from '../../entities/restock-item.entity';
import { OrderStatusHistory } from '../../entities/order-status-history.entity';
import { Payment } from '../../entities/payment.entity';
import { CreateProductDto } from './dto/create-product.dto';
import { IdGenerator } from '../../common/utils/id-generator';
import { UpdateProductDto } from './dto/update-product.dto';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { UpdateTicketDto } from './dto/update-ticket.dto';
import { UpdatePageDto } from './dto/update-page.dto';
import { RestockDto } from './dto/restock.dto';
import { ReplyTicketDto } from './dto/reply-ticket.dto';
import { UpdateCustomerStatusDto } from './dto/update-customer-status.dto';
import { EmailService } from '../email/email.service';
import * as XLSX from 'xlsx';

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(Order)
    private orderRepository: Repository<Order>,
    @InjectRepository(Product)
    private productRepository: Repository<Product>,
    @InjectRepository(Category)
    private categoryRepository: Repository<Category>,
    @InjectRepository(SupportTicket)
    private ticketRepository: Repository<SupportTicket>,
    @InjectRepository(Page)
    private pageRepository: Repository<Page>,
    @InjectRepository(ProductVariant)
    private variantRepository: Repository<ProductVariant>,
    @InjectRepository(ProductImage)
    private imageRepository: Repository<ProductImage>,
    @InjectRepository(Promotion)
    private promotionRepository: Repository<Promotion>,
    @InjectRepository(ChatSession)
    private sessionRepository: Repository<ChatSession>,
    @InjectRepository(ChatMessage)
    private messageRepository: Repository<ChatMessage>,
    @InjectRepository(AiRecommendation)
    private recommendationRepository: Repository<AiRecommendation>,
    @InjectRepository(Customer)
    private customerRepository: Repository<Customer>,
    @InjectRepository(CustomerAddress)
    private addressRepository: Repository<CustomerAddress>,
    @InjectRepository(SupportTicketReply)
    private ticketReplyRepository: Repository<SupportTicketReply>,
    @InjectRepository(RestockBatch)
    private restockBatchRepository: Repository<RestockBatch>,
    @InjectRepository(RestockItem)
    private restockItemRepository: Repository<RestockItem>,
    @InjectRepository(OrderStatusHistory)
    private statusHistoryRepository: Repository<OrderStatusHistory>,
    @InjectRepository(Payment)
    private paymentRepository: Repository<Payment>,
    private emailService: EmailService,
  ) { }

  // ==================== DASHBOARD ====================
  async getDashboardStats() {
    const totalOrders = await this.orderRepository.count();
    const totalCustomers = await this.customerRepository.count();
    const totalProducts = await this.productRepository.count();

    const orders = await this.orderRepository.find({
      order: { created_at: 'DESC' },
      take: 10,
    });

    const totalRevenue = await this.orderRepository
      .createQueryBuilder('o')
      .select('SUM(o.total_amount)', 'total')
      .where('o.fulfillment_status != :status', { status: 'cancelled' })
      .getRawOne();

    return {
      stats: {
        totalOrders,
        totalCustomers,
        totalProducts,
        totalRevenue: parseFloat(totalRevenue?.total || 0),
      },
      recentOrders: orders,
    };
  }

  async getRecentOrders(limit: number = 10) {
    const orders = await this.orderRepository.find({
      order: { created_at: 'DESC' },
      take: limit,
      relations: ['customer', 'items', 'items.variant', 'items.variant.product'],
    });

    return orders.map(order => ({
      id: order.id,
      customer_name: order.customer?.name || 'Guest',
      customer_email: order.customer?.email || order.customer_email,
      total_amount: order.total_amount,
      status: order.fulfillment_status,
      payment_status: order.payment_status,
      created_at: order.created_at,
      items_count: order.items?.length || 0,
    }));
  }

  async getTopProducts(limit: number = 10) {
    const topProducts = await this.orderRepository
      .createQueryBuilder('o')
      .innerJoin('o.items', 'item')
      .innerJoin('item.variant', 'variant')
      .innerJoin('variant.product', 'product')
      .select('product.id', 'product_id')
      .addSelect('product.name', 'product_name')
      .addSelect('product.thumbnail_url', 'thumbnail_url')
      .addSelect('SUM(item.quantity)', 'total_sold')
      .addSelect('SUM(item.quantity * item.price_at_purchase)', 'revenue')
      .where('o.fulfillment_status != :status', { status: 'cancelled' })
      .groupBy('product.id')
      .addGroupBy('product.name')
      .addGroupBy('product.thumbnail_url')
      .orderBy('total_sold', 'DESC')
      .limit(limit)
      .getRawMany();

    return topProducts.map(p => ({
      product_id: p.product_id,
      product_name: p.product_name,
      thumbnail_url: p.thumbnail_url,
      total_sold: parseInt(p.total_sold),
      revenue: parseFloat(p.revenue),
    }));
  }

  async getRevenueChart(period: string = '7d') {
    let daysBack = 7;
    if (period === '30d') daysBack = 30;
    else if (period === '90d') daysBack = 90;

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysBack);

    const revenueData = await this.orderRepository
      .createQueryBuilder('o')
      .select('DATE(o.created_at)', 'date')
      .addSelect('COUNT(o.id)', 'orders')
      .addSelect('SUM(o.total_amount)', 'revenue')
      .where('o.created_at >= :startDate', { startDate })
      .andWhere('o.fulfillment_status != :status', { status: 'cancelled' })
      .groupBy('DATE(o.created_at)')
      .orderBy('date', 'ASC')
      .getRawMany();

    const chartData = revenueData.map(d => ({
      date: d.date,
      orders: parseInt(d.orders),
      revenue: parseFloat(d.revenue),
    }));

    const totalRevenue = chartData.reduce((sum, d) => sum + d.revenue, 0);

    // Calculate growth percentage (compare with previous period)
    const prevStartDate = new Date(startDate);
    prevStartDate.setDate(prevStartDate.getDate() - daysBack);

    const prevRevenue = await this.orderRepository
      .createQueryBuilder('o')
      .select('SUM(o.total_amount)', 'total')
      .where('o.created_at >= :prevStart', { prevStart: prevStartDate })
      .andWhere('o.created_at < :startDate', { startDate })
      .andWhere('o.fulfillment_status != :status', { status: 'cancelled' })
      .getRawOne();

    const previousTotal = parseFloat(prevRevenue?.total || 0);
    const growthPercentage =
      previousTotal > 0 ? ((totalRevenue - previousTotal) / previousTotal) * 100 : 0;

    return {
      chart_data: chartData,
      total_revenue: totalRevenue,
      growth_percentage: parseFloat(growthPercentage.toFixed(2)),
    };
  }

  async getRevenueOrdersTrend(days: number = 30) {
    const validDays = [7, 30, 90].includes(days) ? days : 30;

    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - validDays);

    const dailyData = await this.orderRepository
      .createQueryBuilder('o')
      .select('DATE(o.created_at)', 'date')
      .addSelect('COUNT(o.id)', 'ordersCount')
      .addSelect('SUM(o.total_amount)', 'revenue')
      .where('o.created_at >= :startDate', { startDate })
      .andWhere('o.created_at <= :endDate', { endDate })
      .andWhere('o.fulfillment_status != :status', { status: 'cancelled' })
      .groupBy('DATE(o.created_at)')
      .orderBy('date', 'ASC')
      .getRawMany();

    const dailyStats = dailyData.map((d, index) => {
      const revenue = parseFloat(d.revenue || 0);
      return {
        date: d.date,
        day: `Day ${index + 1}`,
        revenue: revenue,
        revenueInMillions: parseFloat((revenue / 1000000).toFixed(1)),
        ordersCount: parseInt(d.ordersCount),
      };
    });

    const totalRevenue = dailyStats.reduce((sum, d) => sum + d.revenue, 0);
    const totalOrders = dailyStats.reduce((sum, d) => sum + d.ordersCount, 0);
    const averageDailyRevenue = validDays > 0 ? totalRevenue / validDays : 0;
    const averageDailyOrders = validDays > 0 ? totalOrders / validDays : 0;

    const prevStartDate = new Date(startDate);
    prevStartDate.setDate(prevStartDate.getDate() - validDays);

    const prevPeriodData = await this.orderRepository
      .createQueryBuilder('o')
      .select('COUNT(o.id)', 'ordersCount')
      .addSelect('SUM(o.total_amount)', 'revenue')
      .where('o.created_at >= :prevStart', { prevStart: prevStartDate })
      .andWhere('o.created_at < :startDate', { startDate })
      .andWhere('o.fulfillment_status != :status', { status: 'cancelled' })
      .getRawOne();

    const prevRevenue = parseFloat(prevPeriodData?.revenue || 0);
    const prevOrders = parseInt(prevPeriodData?.ordersCount || 0);

    const revenueGrowth = prevRevenue > 0 ? ((totalRevenue - prevRevenue) / prevRevenue) * 100 : 0;
    const ordersGrowth = prevOrders > 0 ? ((totalOrders - prevOrders) / prevOrders) * 100 : 0;

    return {
      success: true,
      data: {
        dailyStats,
        summary: {
          totalRevenue,
          totalOrders,
          averageDailyRevenue: parseFloat(averageDailyRevenue.toFixed(2)),
          averageDailyOrders: parseFloat(averageDailyOrders.toFixed(2)),
          revenueGrowth: parseFloat(revenueGrowth.toFixed(1)),
          ordersGrowth: parseFloat(ordersGrowth.toFixed(1)),
        },
        dateRange: {
          from: startDate.toISOString().split('T')[0],
          to: endDate.toISOString().split('T')[0],
        },
      },
    };
  }

  async getOrderStatusDistribution(days: number = 30) {
    const validDays = [7, 30, 90].includes(days) ? days : 30;

    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - validDays);

    const statusData = await this.orderRepository
      .createQueryBuilder('o')
      .select('o.fulfillment_status', 'status')
      .addSelect('COUNT(o.id)', 'count')
      .where('o.created_at >= :startDate', { startDate })
      .andWhere('o.created_at <= :endDate', { endDate })
      .groupBy('o.fulfillment_status')
      .getRawMany();

    const totalOrders = statusData.reduce((sum, s) => sum + parseInt(s.count), 0);

    const statusColorMap = {
      completed: { label: 'Completed', color: '#10b981' },
      processing: { label: 'Processing', color: '#3b82f6' },
      pending: { label: 'Pending', color: '#f59e0b' },
      cancelled: { label: 'Cancelled', color: '#ef4444' },
      delivered: { label: 'Delivered', color: '#10b981' },
      shipping: { label: 'Shipping', color: '#3b82f6' },
    };

    const distribution = statusData.map(s => {
      const count = parseInt(s.count);
      const percentage = totalOrders > 0 ? (count / totalOrders) * 100 : 0;
      const statusInfo = statusColorMap[s.status] || {
        label: s.status.charAt(0).toUpperCase() + s.status.slice(1),
        color: '#6b7280',
      };

      return {
        status: s.status,
        statusLabel: statusInfo.label,
        count,
        percentage: parseFloat(percentage.toFixed(1)),
        color: statusInfo.color,
      };
    });

    distribution.sort((a, b) => b.count - a.count);

    const completedCount = distribution.find(d => d.status === 'completed')?.count || 0;
    const cancelledCount = distribution.find(d => d.status === 'cancelled')?.count || 0;

    const completionRate = totalOrders > 0 ? (completedCount / totalOrders) * 100 : 0;
    const cancellationRate = totalOrders > 0 ? (cancelledCount / totalOrders) * 100 : 0;

    return {
      success: true,
      data: {
        distribution,
        summary: {
          totalOrders,
          completionRate: parseFloat(completionRate.toFixed(1)),
          cancellationRate: parseFloat(cancellationRate.toFixed(1)),
        },
        dateRange: {
          from: startDate.toISOString().split('T')[0],
          to: endDate.toISOString().split('T')[0],
        },
      },
    };
  }

  // ==================== PRODUCTS MANAGEMENT ====================
  async getProducts(query: any) {
    const page = parseInt(query.page) || 1;
    const limit = parseInt(query.limit) || 20;
    const skip = (page - 1) * limit;

    const queryBuilder = this.productRepository
      .createQueryBuilder('product')
      .leftJoinAndSelect('product.category', 'category')
      .leftJoinAndSelect('product.images', 'images')
      .leftJoinAndSelect('product.variants', 'variants');

    // Search
    if (query.search) {
      queryBuilder.andWhere('(product.name ILIKE :search OR product.sku ILIKE :search)', {
        search: `%${query.search}%`,
      });
    }

    // Filter by category
    if (query.category_id) {
      queryBuilder.andWhere('product.category_id = :category_id', {
        category_id: query.category_id,
      });
    }

    // Filter by status
    if (query.status) {
      queryBuilder.andWhere('product.status = :status', { status: query.status });
    }

    const [products, total] = await queryBuilder
      .orderBy('product.created_at', 'DESC')
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    return {
      data: products,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async createProduct(createProductDto: CreateProductDto) {
    // DEPRECATED: Use AdminProductsService instead
    throw new BadRequestException('Please use /api/v1/admin/products endpoints');
  }

  async updateProduct(id: string, updateProductDto: UpdateProductDto) {
    // DEPRECATED: Use AdminProductsService instead
    throw new BadRequestException('Please use /api/v1/admin/products endpoints');
  }

  // ==================== CATEGORIES MANAGEMENT ====================
  async getCategories() {
    const categories = await this.categoryRepository.find({
      order: { name: 'ASC' },
    });

    return {
      data: categories,
      total: categories.length,
    };
  }

  async createCategory(createCategoryDto: CreateCategoryDto) {
    const id = `cat_${Date.now()}`;
    const slug = this.generateSlug(createCategoryDto.name);

    // Check slug uniqueness
    const existingCategory = await this.categoryRepository.findOne({ where: { slug } });
    if (existingCategory) {
      throw new BadRequestException('Slug danh mục đã tồn tại');
    }

    const category = this.categoryRepository.create({
      slug,
      ...createCategoryDto,
    });

    await this.categoryRepository.save(category);

    return {
      message: 'Tạo danh mục thành công',
      data: category,
    };
  }

  async updateCategory(id: string, updateCategoryDto: UpdateCategoryDto) {
    const category = await this.categoryRepository.findOne({ where: { id: parseInt(id) as any } });

    if (!category) {
      throw new NotFoundException('Không tìm thấy danh mục');
    }

    // Update slug if name changed
    if (updateCategoryDto.name && updateCategoryDto.name !== category.name) {
      category.slug = this.generateSlug(updateCategoryDto.name);
    }

    Object.assign(category, updateCategoryDto);
    await this.categoryRepository.save(category);

    return {
      message: 'Cập nhật danh mục thành công',
      data: category,
    };
  }

  // ==================== ORDERS MANAGEMENT ====================
  async getOrders(query: any) {
    const page = parseInt(query.page) || 1;
    const limit = parseInt(query.limit) || 20;
    const skip = (page - 1) * limit;

    const queryBuilder = this.orderRepository
      .createQueryBuilder('o')
      .leftJoinAndSelect('o.customer', 'customer')
      .leftJoinAndSelect('o.items', 'items')
      .leftJoinAndSelect('items.variant', 'variant')
      .leftJoinAndSelect('variant.product', 'product');

    // Filter by status
    if (query.status) {
      queryBuilder.andWhere('o.fulfillment_status = :status', { status: query.status });
    }

    // Filter by customer email
    if (query.customer_email) {
      queryBuilder.andWhere('(customer.email ILIKE :email OR o.customer_email ILIKE :email)', {
        email: `%${query.customer_email}%`,
      });
    }

    const [orders, total] = await queryBuilder
      .orderBy('o.created_at', 'DESC')
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    return {
      data: orders,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async updateOrderStatus(id: string, status: string) {
    const order = await this.orderRepository.findOne({ where: { id: parseInt(id) as any } });

    if (!order) {
      throw new NotFoundException('Không tìm thấy đơn hàng');
    }

    order.fulfillment_status = status;
    await this.orderRepository.save(order);

    return {
      message: 'Cập nhật trạng thái đơn hàng thành công',
      data: order,
    };
  }

  async getOrderById(orderId: number) {
    const order = await this.orderRepository.findOne({
      where: { id: orderId },
      relations: [
        'customer',
        'items',
        'items.variant',
        'items.variant.product',
        'items.variant.size',
        'items.variant.color',
      ],
    });

    if (!order) {
      throw new NotFoundException('Không tìm thấy đơn hàng');
    }

    // Get status history with admin info
    const statusHistory = await this.statusHistoryRepository.find({
      where: { order_id: orderId },
      relations: ['admin'],
      order: { created_at: 'ASC' },
    });

    return {
      ...order,
      status_history: statusHistory.map(h => ({
        id: h.id,
        status: h.status,
        note: h.note,
        created_at: h.created_at,
        admin: h.admin
          ? {
            id: h.admin.id,
            name: h.admin.name,
            email: h.admin.email,
          }
          : null,
      })),
    };
  }

  async getOrderStatistics() {
    const totalOrders = await this.orderRepository.count();

    const pendingOrders = await this.orderRepository.count({
      where: { fulfillment_status: 'pending' },
    });

    const confirmedOrders = await this.orderRepository.count({
      where: { fulfillment_status: 'confirmed' },
    });

    const shippedOrders = await this.orderRepository.count({
      where: { fulfillment_status: 'shipped' },
    });

    const deliveredOrders = await this.orderRepository.count({
      where: { fulfillment_status: 'delivered' },
    });

    const cancelledOrders = await this.orderRepository.count({
      where: { fulfillment_status: 'cancelled' },
    });

    const totalRevenue = await this.orderRepository
      .createQueryBuilder('o')
      .select('SUM(o.total_amount)', 'total')
      .where('o.fulfillment_status != :status', { status: 'cancelled' })
      .getRawOne();

    const avgOrderValue = await this.orderRepository
      .createQueryBuilder('o')
      .select('AVG(o.total_amount)', 'avg')
      .where('o.fulfillment_status != :status', { status: 'cancelled' })
      .getRawOne();

    return {
      total_orders: totalOrders,
      pending_orders: pendingOrders,
      confirmed_orders: confirmedOrders,
      shipped_orders: shippedOrders,
      delivered_orders: deliveredOrders,
      cancelled_orders: cancelledOrders,
      total_revenue: parseFloat(totalRevenue?.total || 0),
      avg_order_value: parseFloat(avgOrderValue?.avg || 0),
    };
  }

  // ==================== CUSTOMERS MANAGEMENT ====================
  async getCustomers(query: any) {
    const page = parseInt(query.page) || 1;
    const limit = parseInt(query.limit) || 20;
    const skip = (page - 1) * limit;

    const queryBuilder = this.customerRepository
      .createQueryBuilder('customer')
      .select([
        'customer.id',
        'customer.name',
        'customer.email',
        'customer.status',
        'customer.created_at',
      ]);

    // Search
    if (query.search) {
      queryBuilder.andWhere('(customer.name ILIKE :search OR customer.email ILIKE :search)', {
        search: `%${query.search}%`,
      });
    }

    const [customers, total] = await queryBuilder
      .orderBy('customer.created_at', 'DESC')
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    return {
      data: customers,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getCustomerById(id: number) {
    const customer = await this.customerRepository.findOne({
      where: { id },
    });

    if (!customer) {
      throw new NotFoundException('Không tìm thấy khách hàng');
    }

    // Calculate total spent and orders count
    const totalSpentResult = await this.orderRepository
      .createQueryBuilder('o')
      .select('COALESCE(SUM(o.total_amount), 0)', 'total')
      .addSelect('COUNT(o.id)', 'count')
      .where('o.customer_id = :customerId', { customerId: id })
      .andWhere('o.fulfillment_status != :status', { status: 'cancelled' })
      .getRawOne();

    // Get recent 5 orders
    const recentOrders = await this.orderRepository.find({
      where: { customer_id: id },
      select: ['id', 'total_amount', 'fulfillment_status', 'created_at'],
      order: { created_at: 'DESC' },
      take: 5,
    });

    // Get default address (or most recent)
    const defaultAddress = await this.addressRepository.findOne({
      where: { customer_id: id, is_default: true },
      order: { id: 'DESC' },
    });

    // If no default, get most recent
    const address = defaultAddress || await this.addressRepository.findOne({
      where: { customer_id: id },
      order: { id: 'DESC' },
    });

    // Format address string
    const addressString = address
      ? `${address.street_address}, ${address.ward || ''}, ${address.district || ''}, ${address.province || ''}`.replace(/,\s*,/g, ',').trim()
      : null;

    return {
      data: {
        id: customer.id,
        name: customer.name,
        email: customer.email,
        phone: address?.phone_number || null,
        address: addressString,
        status: customer.status,
        created_at: customer.created_at,
        updated_at: customer.updated_at,
        total_orders: parseInt(totalSpentResult?.count || '0'),
        total_spent: parseFloat(totalSpentResult?.total || '0'),
        recent_orders: recentOrders.map(order => ({
          id: order.id,
          total_amount: parseFloat(String(order.total_amount || '0')),
          status: order.fulfillment_status,
          created_at: order.created_at,
        })),
      },
    };
  }

  async getCustomerStatistics() {
    const totalCustomers = await this.customerRepository.count();

    const activeCustomers = await this.customerRepository.count({
      where: { status: 'active' },
    });

    const inactiveCustomers = await this.customerRepository.count({
      where: { status: 'inactive' },
    });

    // Count new customers this month
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const newCustomersThisMonth = await this.customerRepository.count({
      where: {
        created_at: MoreThanOrEqual(startOfMonth),
      },
    });

    // Get top customers by spending
    const topCustomers = await this.orderRepository
      .createQueryBuilder('o')
      .select('o.customer_id', 'customer_id')
      .addSelect('customer.name', 'customer_name')
      .addSelect('customer.email', 'customer_email')
      .addSelect('COUNT(o.id)', 'total_orders')
      .addSelect('SUM(o.total_amount)', 'total_spent')
      .innerJoin('o.customer', 'customer')
      .where('o.fulfillment_status != :status', { status: 'cancelled' })
      .groupBy('o.customer_id')
      .addGroupBy('customer.name')
      .addGroupBy('customer.email')
      .orderBy('total_spent', 'DESC')
      .limit(10)
      .getRawMany();

    return {
      total_customers: totalCustomers,
      active_customers: activeCustomers,
      inactive_customers: inactiveCustomers,
      new_customers_this_month: newCustomersThisMonth,
      top_customers: topCustomers.map(c => ({
        customer_id: c.customer_id,
        customer_name: c.customer_name,
        customer_email: c.customer_email,
        total_orders: parseInt(c.total_orders),
        total_spent: parseFloat(c.total_spent),
      })),
    };
  }

  // ==================== SUPPORT TICKETS MANAGEMENT ====================
  async updateTicket(id: number, updateTicketDto: UpdateTicketDto) {
    const ticket = await this.ticketRepository.findOne({ where: { id } as any });

    if (!ticket) {
      throw new NotFoundException('Không tìm thấy ticket');
    }

    // Only update status - replies are handled separately via support_ticket_replies table
    Object.assign(ticket, updateTicketDto);
    await this.ticketRepository.save(ticket);

    return {
      message: 'Cập nhật ticket thành công',
      data: ticket,
    };
  }

  async updatePage(slug: string, updatePageDto: UpdatePageDto) {
    const page = await this.pageRepository.findOne({ where: { slug } });

    if (!page) {
      throw new NotFoundException('Không tìm thấy trang');
    }

    Object.assign(page, updatePageDto);
    // updated_at will be automatically set by @UpdateDateColumn
    await this.pageRepository.save(page);

    return {
      message: 'Cập nhật trang thành công',
      data: page,
    };
  }

  // ==================== INVENTORY MANAGEMENT ====================
  async getInventory(lowStockOnly: boolean = false) {
    const queryBuilder = this.variantRepository
      .createQueryBuilder('variant')
      .leftJoinAndSelect('variant.product', 'product')
      .leftJoinAndSelect('variant.size', 'size')
      .leftJoinAndSelect('variant.color', 'color')
      .select([
        'variant.id',
        'variant.sku',
        'variant.total_stock',
        'variant.reserved_stock',
        'variant.reorder_point',
        'variant.status',
        'product.id',
        'product.name',
        'size.id',
        'size.name',
        'color.id',
        'color.name',
      ]);

    if (lowStockOnly) {
      queryBuilder.where('variant.total_stock < :threshold', { threshold: 10 });
    }

    const variants = await queryBuilder.orderBy('variant.total_stock', 'ASC').getMany();

    return {
      data: variants.map(v => ({
        id: v.id,
        sku: v.sku,
        product_name: v.product?.name,
        size_name: v.size?.name,
        color_name: v.color?.name,
        total_stock: v.total_stock,
        reserved_stock: v.reserved_stock,
        available_stock: v.total_stock - v.reserved_stock,
        reorder_point: v.reorder_point,
        status: v.status,
      })),
      total: variants.length,
      lowStockCount: variants.filter(v => v.total_stock < 10).length,
    };
  }

  // ==================== PRODUCT VARIANTS MANAGEMENT ====================
  async createVariant(productId: string, variantData: any) {
    // DEPRECATED: Use new ProductVariantsService
    throw new BadRequestException('Please use /api/v1/admin/variants endpoints');
  }

  async updateVariant(productId: string, variantId: string, updateData: any) {
    // DEPRECATED
    throw new BadRequestException('Please use /api/v1/admin/variants endpoints');
  }

  async deleteVariant(productId: string, variantId: string) {
    // DEPRECATED
    throw new BadRequestException('Please use /api/v1/admin/variants endpoints');
  }

  // ==================== PRODUCT IMAGES MANAGEMENT ====================
  async createImage(productId: string, imageData: any) {
    // DEPRECATED
    throw new BadRequestException('Please use /api/v1/admin/images endpoints');
  }

  async updateImage(productId: string, imageId: string, updateData: any) {
    // DEPRECATED
    throw new BadRequestException('Please use /api/v1/admin/images endpoints');
  }

  async deleteImage(productId: string, imageId: string) {
    // DEPRECATED
    throw new BadRequestException('Please use /api/v1/admin/images endpoints');
  }

  // ==================== PROMOTIONS MANAGEMENT ====================
  async getPromotions(query: any = {}) {
    const page = parseInt(query.page) || 1;
    const limit = parseInt(query.limit) || 20;
    const skip = (page - 1) * limit;

    const queryBuilder = this.promotionRepository
      .createQueryBuilder('promotion')
      .orderBy('promotion.start_date', 'DESC');

    // Filter by status
    if (query.status) {
      queryBuilder.andWhere('promotion.status = :status', { status: query.status });
    }

    // Filter by name (search)
    if (query.search) {
      queryBuilder.andWhere('promotion.name ILIKE :search', {
        search: `%${query.search}%`,
      });
    }

    // Filter active promotions only
    if (query.active === 'true') {
      queryBuilder
        .andWhere('promotion.status = :status', { status: 'active' })
        .andWhere('promotion.end_date >= CURRENT_DATE');
    }

    const [promotions, total] = await queryBuilder.skip(skip).take(limit).getManyAndCount();

    return {
      promotions,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /*
   * ==================== PROMOTIONS ====================
   * DEPRECATED: Promotion schema changed - these methods disabled
   * Use PromotionsModule for new promotion management
   */
  async getPromotionById(id: string) {
    throw new BadRequestException('Feature deprecated - use /api/v1/promotions');
  }

  async createPromotion(createPromotionDto: any) {
    throw new BadRequestException('Feature deprecated - use /api/v1/promotions');
  }

  async updatePromotion(id: string, updatePromotionDto: any) {
    throw new BadRequestException('Feature deprecated - use /api/v1/promotions');
  }

  async deletePromotion(id: string) {
    throw new BadRequestException('Feature deprecated - use /api/v1/promotions');
  }

  async togglePromotionStatus(id: string) {
    throw new BadRequestException('Feature deprecated - use /api/v1/promotions');
  }

  async getPromotionUsageStats(code: string) {
    throw new BadRequestException('Feature deprecated - use /api/v1/promotions');
  }

  // ==================== CHATBOT ANALYTICS ====================
  async getChatbotConversations(query: any = {}) {
    const page = parseInt(query.page) || 1;
    const limit = parseInt(query.limit) || 20;
    const skip = (page - 1) * limit;

    const queryBuilder = this.sessionRepository
      .createQueryBuilder('session')
      .leftJoinAndSelect('session.customer', 'customer')
      .leftJoin('session.messages', 'messages')
      .addSelect('COUNT(messages.id)', 'message_count')
      .groupBy('session.id')
      .addGroupBy('customer.id')
      .orderBy('session.updated_at', 'DESC');

    // Search by customer email or visitor_id
    if (query.search) {
      queryBuilder.andWhere('(customer.email ILIKE :search OR session.visitor_id ILIKE :search)', {
        search: `%${query.search}%`,
      });
    }

    const [sessions, total] = await queryBuilder.skip(skip).take(limit).getManyAndCount();

    return {
      conversations: sessions,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getChatbotConversationDetail(id: number) {
    const session = await this.sessionRepository.findOne({
      where: { id },
      relations: ['customer'],
    });

    if (!session) {
      throw new NotFoundException('Không tìm thấy chat session');
    }

    // Get all messages
    const messages = await this.messageRepository.find({
      where: { session_id: id },
      order: { created_at: 'ASC' },
    });

    return {
      session,
      messages,
      message_count: messages.length,
    };
  }

  async getChatbotAnalytics() {
    // Total sessions
    const totalSessions = await this.sessionRepository.count();

    // Total messages
    const totalMessages = await this.messageRepository.count();

    // Average messages per session
    const avgMessagesPerSession =
      totalSessions > 0 ? parseFloat((totalMessages / totalSessions).toFixed(2)) : 0;

    // Count by sender type
    const customerMessages = await this.messageRepository.count({
      where: { sender: 'customer' },
    });

    const botMessages = await this.messageRepository.count({
      where: { sender: 'bot' },
    });

    // Daily activity (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const dailyActivity = await this.sessionRepository
      .createQueryBuilder('session')
      .select('DATE(session.created_at)', 'date')
      .addSelect('COUNT(*)', 'sessions')
      .where('session.created_at >= :startDate', { startDate: thirtyDaysAgo })
      .groupBy('DATE(session.created_at)')
      .orderBy('date', 'ASC')
      .getRawMany();

    return {
      overview: {
        total_sessions: totalSessions,
        total_messages: totalMessages,
        avg_messages_per_session: avgMessagesPerSession,
        customer_messages: customerMessages,
        bot_messages: botMessages,
      },
      daily_activity: dailyActivity,
    };
  }

  async getChatbotTopIntents(limit: number = 10) {
    // Count messages grouped by intent
    const intentStats = await this.messageRepository
      .createQueryBuilder('msg')
      .select('msg.intent', 'intent')
      .addSelect('COUNT(*)', 'count')
      .where('msg.intent IS NOT NULL')
      .andWhere("msg.intent != ''")
      .groupBy('msg.intent')
      .orderBy('count', 'DESC')
      .limit(limit)
      .getRawMany();

    // Calculate total for percentage
    const totalWithIntent = intentStats.reduce((sum, item) => sum + parseInt(item.count), 0);

    // Format response
    const intents = intentStats.map(item => ({
      intent: item.intent,
      count: parseInt(item.count),
      percentage: totalWithIntent > 0 ? Math.round((parseInt(item.count) / totalWithIntent) * 100) : 0,
    }));

    return {
      intents,
      total_conversations: totalWithIntent,
      total_intents_tracked: intents.length,
    };
  }

  async getChatbotUnanswered() {
    // Get sessions with high message count from customers (potential issues)
    const sessions = await this.sessionRepository
      .createQueryBuilder('session')
      .leftJoinAndSelect('session.customer', 'customer')
      .leftJoin('session.messages', 'messages')
      .addSelect('COUNT(messages.id)', 'message_count')
      .groupBy('session.id')
      .addGroupBy('customer.id')
      .having('COUNT(messages.id) >= :minMessages', { minMessages: 5 })
      .orderBy('COUNT(messages.id)', 'DESC')
      .take(50)
      .getMany();

    return {
      unanswered_sessions: sessions,
      count: sessions.length,
    };
  }

  // ==================== AI RECOMMENDATIONS ADMIN ====================
  async getAiRecommendations(query: any = {}) {
    const page = parseInt(query.page) || 1;
    const limit = parseInt(query.limit) || 50;
    const skip = (page - 1) * limit;

    const queryBuilder = this.recommendationRepository
      .createQueryBuilder('rec')
      .leftJoinAndSelect('rec.user', 'user')
      .leftJoinAndSelect('rec.product', 'product')
      .orderBy('rec.created_at', 'DESC');

    // Filter by user_id
    if (query.user_id) {
      queryBuilder.andWhere('rec.user_id = :userId', { userId: query.user_id });
    }

    // Filter by product_id
    if (query.product_id) {
      queryBuilder.andWhere('rec.product_id = :productId', { productId: query.product_id });
    }

    const [recommendations, total] = await queryBuilder.skip(skip).take(limit).getManyAndCount();

    return {
      recommendations,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getAiRecommendationStats() {
    // Total recommendations
    const totalRecommendations = await this.recommendationRepository.count();

    // Count by reason
    const reasonCounts = await this.recommendationRepository
      .createQueryBuilder('rec')
      .select('rec.reason', 'reason')
      .addSelect('COUNT(*)', 'count')
      .groupBy('rec.reason')
      .orderBy('count', 'DESC')
      .getRawMany();

    // Top recommended products
    const topProducts = await this.recommendationRepository
      .createQueryBuilder('rec')
      .select('rec.product_id', 'product_id')
      .addSelect('product.name', 'product_name')
      .addSelect('COUNT(*)', 'recommendation_count')
      .addSelect('AVG(rec.score)', 'avg_score')
      .leftJoin('rec.product', 'product')
      .groupBy('rec.product_id')
      .addGroupBy('product.name')
      .orderBy('recommendation_count', 'DESC')
      .limit(10)
      .getRawMany();

    // Users with most recommendations
    const topUsers = await this.recommendationRepository
      .createQueryBuilder('rec')
      .select('rec.user_id', 'user_id')
      .addSelect('user.name', 'user_name')
      .addSelect('COUNT(*)', 'recommendation_count')
      .leftJoin('rec.user', 'user')
      .groupBy('rec.user_id')
      .addGroupBy('user.name')
      .orderBy('recommendation_count', 'DESC')
      .limit(10)
      .getRawMany();

    return {
      total_recommendations: totalRecommendations,
      reason_counts: reasonCounts,
      top_products: topProducts,
      top_users: topUsers,
    };
  }

  // ==================== INVENTORY RESTOCK ====================
  async restockInventory(adminId: number, restockDto: RestockDto) {
    const queryRunner = this.variantRepository.manager.connection.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Create batch
      const batch = queryRunner.manager.create(RestockBatch, {
        admin_id: adminId,
        type: 'Manual',
      });
      const savedBatch = await queryRunner.manager.save(batch);

      // Process each item
      for (const item of restockDto.items) {
        // Create restock item record
        const restockItem = queryRunner.manager.create(RestockItem, {
          batch_id: savedBatch.id,
          variant_id: item.variant_id,
          quantity: item.quantity,
        });
        await queryRunner.manager.save(restockItem);

        // Update variant stock
        await queryRunner.manager.increment(
          ProductVariant,
          { id: item.variant_id },
          'total_stock',
          item.quantity,
        );
      }

      await queryRunner.commitTransaction();

      return {
        message: 'Inventory restocked successfully',
        batch_id: savedBatch.id,
        items_updated: restockDto.items.length,
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async restockInventoryBatch(adminId: number, file: Express.Multer.File) {
    const workbook = XLSX.read(file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const data: any[] = XLSX.utils.sheet_to_json(sheet);

    if (!data || data.length === 0) {
      throw new BadRequestException('Excel file is empty');
    }

    const queryRunner = this.variantRepository.manager.connection.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    const failedSkus: string[] = [];
    let updatedCount = 0;

    try {
      // Create batch
      const batch = queryRunner.manager.create(RestockBatch, {
        admin_id: adminId,
        type: 'Excel',
      });
      const savedBatch = await queryRunner.manager.save(batch);

      // Process each row
      for (const row of data) {
        const sku = row.sku || row.SKU;
        const quantity = parseInt(row.quantity || row.Quantity, 10);

        if (!sku || isNaN(quantity) || quantity <= 0) {
          failedSkus.push(sku || 'Unknown SKU');
          continue;
        }

        // Find variant by SKU
        const variant = await queryRunner.manager.findOne(ProductVariant, {
          where: { sku },
        });

        if (!variant) {
          failedSkus.push(sku);
          continue;
        }

        // Create restock item
        const restockItem = queryRunner.manager.create(RestockItem, {
          batch_id: savedBatch.id,
          variant_id: variant.id,
          quantity,
        });
        await queryRunner.manager.save(restockItem);

        // Update stock
        await queryRunner.manager.increment(
          ProductVariant,
          { id: variant.id },
          'total_stock',
          quantity,
        );

        updatedCount++;
      }

      await queryRunner.commitTransaction();

      return {
        message: 'Batch restock completed',
        batch_id: savedBatch.id,
        updated_variants: updatedCount,
        failed_skus: failedSkus,
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async getRestockHistory(query: any = {}) {
    const page = parseInt(query.page) || 1;
    const limit = parseInt(query.limit) || 20;
    const skip = (page - 1) * limit;

    const queryBuilder = this.restockBatchRepository
      .createQueryBuilder('batch')
      .leftJoinAndSelect('batch.admin', 'admin')
      .leftJoinAndSelect('batch.items', 'items')
      .select([
        'batch.id',
        'batch.admin_id',
        'batch.type',
        'batch.created_at',
        'admin.id',
        'admin.name',
      ])
      .orderBy('batch.created_at', 'DESC');

    // Filter by type
    if (query.type) {
      queryBuilder.andWhere('batch.type = :type', { type: query.type });
    }

    // Filter by date range
    if (query.start_date) {
      queryBuilder.andWhere('batch.created_at >= :startDate', {
        startDate: query.start_date,
      });
    }
    if (query.end_date) {
      queryBuilder.andWhere('batch.created_at <= :endDate', {
        endDate: query.end_date,
      });
    }

    const [batches, total] = await queryBuilder.skip(skip).take(limit).getManyAndCount();

    // Count items for each batch
    const batchesWithCount = await Promise.all(
      batches.map(async batch => {
        const itemsCount = await this.restockItemRepository.count({
          where: { batch_id: batch.id as any },
        });

        return {
          id: batch.id,
          admin_id: batch.admin_id,
          admin_name: batch.admin?.name || null,
          type: batch.type,
          created_at: batch.created_at,
          items_count: itemsCount,
        };
      }),
    );

    return {
      batches: batchesWithCount,
      total,
      page,
      limit,
    };
  }

  // ==================== SUPPORT TICKETS MANAGEMENT ====================
  async getAllSupportTickets(query: any) {
    const { page = 1, limit = 20, status } = query;
    const skip = (page - 1) * limit;

    const queryBuilder = this.ticketRepository
      .createQueryBuilder('t')
      .leftJoinAndSelect('t.customer', 'c')
      .orderBy('t.created_at', 'DESC');

    if (status) {
      queryBuilder.andWhere('t.status = :status', { status });
    }

    const [tickets, total] = await queryBuilder.skip(skip).take(parseInt(limit)).getManyAndCount();

    return {
      data: tickets,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getSupportTicketDetail(ticketId: number) {
    const ticket = await this.ticketRepository.findOne({
      where: { id: ticketId },
      relations: ['customer'],
    });

    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }

    const replies = await this.ticketReplyRepository.find({
      where: { ticket_id: ticketId },
      relations: ['admin'],
      order: { created_at: 'ASC' },
    });

    return {
      ticket_details: ticket,
      replies,
    };
  }

  async replyToTicket(ticketId: number, adminId: number, replyDto: ReplyTicketDto) {
    const ticket = await this.ticketRepository.findOne({
      where: { id: ticketId },
    });

    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }

    // Create reply
    const reply = this.ticketReplyRepository.create({
      ticket_id: ticketId,
      admin_id: adminId,
      body: replyDto.body,
    });
    await this.ticketReplyRepository.save(reply);

    // Update ticket status
    ticket.status = 'replied';
    await this.ticketRepository.save(ticket);

    // Send email notification
    try {
      await this.emailService.sendMail({
        to: ticket.customer_email,
        subject: `[Ticket #${ticket.ticket_code}] Bạn có phản hồi mới`,
        template: 'ticket-reply',
        context: {
          ticketCode: ticket.ticket_code,
          subject: ticket.subject,
          replyBody: replyDto.body,
        },
      });
    } catch (emailError) {
      console.error('Failed to send email:', emailError);
      // Don't throw - email failure shouldn't fail the operation
    }

    return {
      message: 'Reply sent successfully',
      reply,
    };
  }

  // ==================== CUSTOMER MANAGEMENT ====================
  async updateCustomerStatus(customerId: number, updateStatusDto: UpdateCustomerStatusDto) {
    const customer = await this.customerRepository.findOne({
      where: { id: customerId, deleted_at: null },
    });

    if (!customer) {
      throw new NotFoundException('Customer not found');
    }

    customer.status = updateStatusDto.status;
    await this.customerRepository.save(customer);

    return {
      message: `Customer ${updateStatusDto.status === 'active' ? 'activated' : 'deactivated'} successfully`,
      customer,
    };
  }

  // ==================== ORDER STATUS WITH EMAIL ====================
  async updateOrderStatusWithEmail(
    orderId: number,
    status: string,
    adminId?: number,
    note?: string,
  ) {
    const order = await this.orderRepository.findOne({
      where: { id: orderId },
      relations: ['items', 'items.variant', 'items.variant.product', 'items.variant.size', 'items.variant.color', 'customer'],
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    // Update status
    order.fulfillment_status = status;
    await this.orderRepository.save(order);

    // Log status history
    const history = this.statusHistoryRepository.create({
      order_id: orderId,
      status,
      admin_id: adminId,
      note: note || null,
    });
    await this.statusHistoryRepository.save(history);

    // Send email notification
    try {
      const statusTexts = {
        Pending: 'đang chờ xử lý',
        Confirmed: 'đã được xác nhận',
        Processing: 'đang được xử lý',
        Shipped: 'đã được giao cho đơn vị vận chuyển',
        Delivered: 'đã được giao thành công',
        Cancelled: 'đã bị hủy',
      };

      const statusLabels = {
        Pending: 'Chờ xử lý',
        Confirmed: 'Đã xác nhận',
        Processing: 'Đang xử lý',
        Shipped: 'Đang vận chuyển',
        Delivered: 'Đã giao hàng',
        Cancelled: 'Đã hủy',
      };

      // Format items for email
      const formattedItems = order.items?.map(item => ({
        name: item.variant?.product?.name || 'Sản phẩm',
        image: item.variant?.product?.thumbnail_url || '',
        size: item.variant?.size?.name || 'N/A',
        color: item.variant?.color?.name || 'N/A',
        quantity: item.quantity,
        price: parseFloat(String(item.price_at_purchase || '0')) * 25000,
      })) || [];

      const subtotal = formattedItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      const shippingFee = parseFloat(String(order.shipping_fee || '0')) * 25000;
      const total = parseFloat(String(order.total_amount || '0')) * 25000;

      await this.emailService.sendMail({
        to: order.customer_email,
        subject: `Đơn hàng #${order.id} ${statusTexts[status]}`,
        template: 'order-status-update',
        context: {
          orderId: order.id,
          customerName: order.customer?.name || order.customer_email,
          newStatus: status,
          statusLabel: statusLabels[status] || status,
          statusText: statusTexts[status],
          items: formattedItems,
          subtotal,
          shippingFee,
          totalAmount: total,
          shippingAddress: order.shipping_address,
          shippingPhone: order.shipping_phone,
          trackingNumber: order.tracking_number || null,
          carrierName: order.carrier_name || 'Standard Delivery',
          note: note || null,
        },
      });
    } catch (emailError) {
      console.error('Failed to send email:', emailError);
    }

    return {
      message: 'Order status updated successfully',
      order,
    };
  }

  // ==================== PAYMENT STATUS UPDATE ====================
  async updatePaymentStatus(orderId: number, paymentStatus: 'paid' | 'unpaid') {
    const order = await this.orderRepository.findOne({
      where: { id: orderId },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    order.payment_status = paymentStatus;
    await this.orderRepository.save(order);

    return {
      message: 'Payment status updated successfully',
      order,
    };
  }

  // ==================== INVOICE GENERATION ====================
  async generateInvoiceHtml(orderId: number) {
    const order = await this.orderRepository.findOne({
      where: { id: orderId },
      relations: ['items', 'items.variant', 'items.variant.product', 'items.variant.size', 'items.variant.color', 'customer'],
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    // Format items for invoice
    const formattedItems = order.items?.map(item => ({
      name: item.variant?.product?.name || 'Sản phẩm',
      size: item.variant?.size?.name || 'N/A',
      color: item.variant?.color?.name || 'N/A',
      quantity: item.quantity,
      price: parseFloat(String(item.price_at_purchase || '0')) * 25000,
      subtotal: parseFloat(String(item.price_at_purchase || '0')) * item.quantity * 25000,
    })) || [];

    const subtotal = formattedItems.reduce((sum, item) => sum + item.subtotal, 0);
    const shippingFee = parseFloat(String(order.shipping_fee || '0')) * 25000;
    const total = parseFloat(String(order.total_amount || '0')) * 25000;

    // Generate HTML invoice
    const itemsHtml = formattedItems.map((item, index) => `
      <tr>
        <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: center;">${index + 1}</td>
        <td style="padding: 12px; border-bottom: 1px solid #eee;">
          <div style="font-weight: 600;">${item.name}</div>
          <div style="font-size: 13px; color: #666;">Size: ${item.size} | Màu: ${item.color}</div>
        </td>
        <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: center;">${item.quantity}</td>
        <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: right;">${item.price.toLocaleString('vi-VN')}đ</td>
        <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: right; font-weight: 600;">${item.subtotal.toLocaleString('vi-VN')}đ</td>
      </tr>
    `).join('');

    const invoiceHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Hóa đơn #${order.id} - LeCas Fashion</title>
        <style>
          body { 
            font-family: Arial, sans-serif; 
            line-height: 1.6; 
            color: #333; 
            margin: 0; 
            padding: 20px;
            background: #f5f5f5;
          }
          .invoice-container { 
            max-width: 800px; 
            margin: 0 auto; 
            background: #fff; 
            padding: 40px;
            box-shadow: 0 0 10px rgba(0,0,0,0.1);
          }
          .header { 
            border-bottom: 3px solid #000; 
            padding-bottom: 20px; 
            margin-bottom: 30px;
            display: flex;
            justify-content: space-between;
            align-items: start;
          }
          .header h1 { 
            margin: 0; 
            font-size: 32px; 
            color: #000;
          }
          .header .invoice-info {
            text-align: right;
          }
          .header .invoice-info h2 {
            margin: 0 0 10px 0;
            font-size: 24px;
            color: #666;
          }
          .info-section {
            margin: 30px 0;
            display: flex;
            justify-content: space-between;
          }
          .info-box {
            flex: 1;
            padding: 15px;
            background: #f8f9fa;
            border-radius: 8px;
            margin-right: 15px;
          }
          .info-box:last-child { margin-right: 0; }
          .info-box h3 {
            margin: 0 0 10px 0;
            font-size: 14px;
            color: #666;
            text-transform: uppercase;
          }
          .info-box p { margin: 5px 0; font-size: 14px; }
          table { 
            width: 100%; 
            border-collapse: collapse; 
            margin: 30px 0;
          }
          thead {
            background: #f0f0f0;
          }
          th { 
            padding: 12px; 
            text-align: left; 
            font-weight: 600;
            font-size: 14px;
            border-bottom: 2px solid #ddd;
          }
          th.center, td.center { text-align: center; }
          th.right, td.right { text-align: right; }
          .totals {
            margin-top: 30px;
            float: right;
            width: 300px;
          }
          .totals .row {
            display: flex;
            justify-content: space-between;
            padding: 8px 0;
            font-size: 14px;
          }
          .totals .row.final {
            border-top: 2px solid #000;
            padding-top: 12px;
            margin-top: 12px;
            font-size: 18px;
            font-weight: bold;
          }
          .footer {
            margin-top: 80px;
            padding-top: 20px;
            border-top: 1px solid #eee;
            text-align: center;
            color: #666;
            font-size: 12px;
          }
          .status-badge {
            display: inline-block;
            padding: 6px 12px;
            border-radius: 4px;
            font-size: 12px;
            font-weight: bold;
            text-transform: uppercase;
          }
          .status-paid { background: #d4edda; color: #155724; }
          .status-unpaid { background: #fff3cd; color: #856404; }
          @media print {
            body { background: #fff; padding: 0; }
            .invoice-container { box-shadow: none; }
          }
        </style>
      </head>
      <body>
        <div class="invoice-container">
          <div class="header">
            <div>
              <h1>LeCas Fashion</h1>
              <p style="margin: 5px 0 0 0; color: #666;">Thời trang nam chất lượng cao</p>
            </div>
            <div class="invoice-info">
              <h2>HÓA ĐƠN</h2>
              <p><strong>#${order.id}</strong></p>
              <p>${new Date(order.created_at).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })}</p>
            </div>
          </div>

          <div class="info-section">
            <div class="info-box">
              <h3>Thông tin khách hàng</h3>
              <p><strong>${order.customer?.name || order.customer_email}</strong></p>
              <p>Email: ${order.customer_email}</p>
              <p>SĐT: ${order.shipping_phone}</p>
            </div>
            <div class="info-box">
              <h3>Địa chỉ giao hàng</h3>
              <p>${order.shipping_address}</p>
              ${order.shipping_ward ? `<p>${order.shipping_ward}</p>` : ''}
              ${order.shipping_district ? `<p>${order.shipping_district}</p>` : ''}
              ${order.shipping_city ? `<p>${order.shipping_city}</p>` : ''}
            </div>
            <div class="info-box">
              <h3>Trạng thái</h3>
              <p><span class="status-badge ${order.payment_status === 'paid' ? 'status-paid' : 'status-unpaid'}">
                ${order.payment_status === 'paid' ? 'Đã thanh toán' : 'Chưa thanh toán'}
              </span></p>
              <p style="margin-top: 8px;"><strong>Phương thức:</strong><br/>${order.payment_method === 'cod' ? 'COD (Tiền mặt)' : order.payment_method}</p>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th class="center" style="width: 50px;">STT</th>
                <th>Sản phẩm</th>
                <th class="center" style="width: 80px;">Số lượng</th>
                <th class="right" style="width: 120px;">Đơn giá</th>
                <th class="right" style="width: 120px;">Thành tiền</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
          </table>

          <div style="clear: both;">
            <div class="totals">
              <div class="row">
                <span>Tạm tính:</span>
                <span>${subtotal.toLocaleString('vi-VN')}đ</span>
              </div>
              <div class="row">
                <span>Phí vận chuyển:</span>
                <span>${shippingFee.toLocaleString('vi-VN')}đ</span>
              </div>
              <div class="row final">
                <span>Tổng cộng:</span>
                <span>${total.toLocaleString('vi-VN')}đ</span>
              </div>
            </div>
          </div>

          <div class="footer">
            <p><strong>LeCas Fashion</strong></p>
            <p>Email: support@lecas.com | Hotline: 1900 1009</p>
            <p>&copy; 2024 LeCas Fashion. All rights reserved.</p>
            <p style="margin-top: 10px; font-size: 11px;">Cảm ơn bạn đã mua sắm tại LeCas Fashion!</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return invoiceHtml;
  }

  // ==================== HELPER METHODS ====================
  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd')
      .replace(/[^a-z0-9\s-]/g, '')
      .trim()
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-');
  }

  // ==================== CHAT MANAGEMENT ====================
  async replyChat(sessionId: number, message: string) {
    const session = await this.sessionRepository.findOne({
      where: { id: sessionId },
    });

    if (!session) {
      throw new NotFoundException('Không tìm thấy chat session');
    }

    // Save admin message
    const adminMessage = this.messageRepository.create({
      session_id: sessionId,
      sender: 'admin',
      message: message,
      is_read: false,
    });

    await this.messageRepository.save(adminMessage);

    // Update session timestamp
    session.updated_at = new Date();
    await this.sessionRepository.save(session);

    return {
      message: 'Tin nhắn đã được gửi',
      chat_message: adminMessage,
    };
  }

  // ==================== PAYMENT TRANSACTIONS ====================
  async getTransactions(query: any = {}) {
    const { start_date, end_date, status, page = 1, limit = 20 } = query;
    const skip = (page - 1) * limit;

    const queryBuilder = this.paymentRepository
      .createQueryBuilder('payment')
      .leftJoinAndSelect('payment.order', 'order')
      .orderBy('payment.created_at', 'DESC');

    // Filter by date range
    if (start_date) {
      queryBuilder.andWhere('payment.created_at >= :startDate', {
        startDate: new Date(start_date),
      });
    }

    if (end_date) {
      const endDateTime = new Date(end_date);
      endDateTime.setHours(23, 59, 59, 999);
      queryBuilder.andWhere('payment.created_at <= :endDate', {
        endDate: endDateTime,
      });
    }

    // Filter by status
    if (status) {
      queryBuilder.andWhere('payment.status = :status', { status });
    }

    const [transactions, total] = await queryBuilder.skip(skip).take(limit).getManyAndCount();

    // Calculate summary
    const summary = await this.paymentRepository
      .createQueryBuilder('payment')
      .select('SUM(payment.amount)', 'total_amount')
      .addSelect('COUNT(*)', 'total_count')
      .addSelect('payment.status', 'status')
      .groupBy('payment.status')
      .getRawMany();

    return {
      transactions,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / limit),
      },
      summary,
    };
  }

  // ==================== CUSTOMER DETAIL APIs ====================
  async getCustomerChatHistory(
    customerId: number,
    page: number = 1,
    limit: number = 20,
    status?: string,
    includeMessages: boolean = false,
    messageLimit: number = 3,
  ) {
    const customer = await this.customerRepository.findOne({
      where: { id: customerId },
    });

    if (!customer) {
      throw new NotFoundException('Không tìm thấy khách hàng');
    }

    const queryBuilder = this.sessionRepository
      .createQueryBuilder('session')
      .where('session.customer_id = :customerId', { customerId })
      .orderBy('session.updated_at', 'DESC');

    // Filter by status if provided
    if (status && status !== 'all') {
      queryBuilder.andWhere('session.status = :status', { status });
    }

    const total = await queryBuilder.getCount();
    const sessions = await queryBuilder
      .skip((page - 1) * limit)
      .take(limit)
      .getMany();

    // Get message counts for each session
    const sessionsWithData = await Promise.all(
      sessions.map(async (session) => {
        const messageCount = await this.messageRepository.count({
          where: { session_id: session.id },
        });

        let messages = [];
        if (includeMessages) {
          // Get most recent messages for preview
          messages = await this.messageRepository.find({
            where: { session_id: session.id },
            order: { created_at: 'DESC' },
            take: messageLimit,
          });
          // Reverse to show oldest first in preview
          messages = messages.reverse();
        }

        return {
          id: session.id,
          customer_id: session.customer_id,
          status: session.status || 'unresolved',
          intents: [],
          message_count: messageCount,
          last_message_at: session.updated_at,
          created_at: session.created_at,
          messages: messages.map(msg => ({
            id: msg.id,
            role: msg.sender === 'customer' ? 'user' : msg.sender,
            content: msg.message,
            created_at: msg.created_at,
          })),
        };
      }),
    );

    return {
      data: sessionsWithData,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getSessionMessages(
    customerId: number,
    sessionId: number,
    limit: number = 50,
    offset: number = 0,
  ) {
    // Verify session exists and belongs to customer
    const session = await this.sessionRepository.findOne({
      where: { id: sessionId },
    });

    if (!session) {
      throw new NotFoundException('Session not found');
    }

    if (session.customer_id !== customerId) {
      throw new BadRequestException('Session does not belong to this customer');
    }

    // Get total message count
    const total = await this.messageRepository.count({
      where: { session_id: sessionId },
    });

    // Get messages with pagination
    const messages = await this.messageRepository.find({
      where: { session_id: sessionId },
      order: { created_at: 'ASC' },
      skip: offset,
      take: limit,
    });

    return {
      data: {
        session: {
          id: session.id,
          customer_id: session.customer_id,
          status: session.status || 'unresolved',
          created_at: session.created_at,
          updated_at: session.updated_at,
        },
        messages: messages.map(msg => ({
          id: msg.id,
          session_id: msg.session_id,
          role: msg.sender === 'customer' ? 'user' : msg.sender,
          content: msg.message,
          created_at: msg.created_at,
          metadata: {
            intent: null,
            confidence: null,
            admin_id: null,
            image_url: msg.image_url || null,
            custom: msg.custom || null,
          },
        })),
        total,
        has_more: offset + messages.length < total,
      },
    };
  }

  async getCustomerChatStatistics(customerId: number) {
    const customer = await this.customerRepository.findOne({
      where: { id: customerId },
    });

    if (!customer) {
      throw new NotFoundException('Không tìm thấy khách hàng');
    }

    // Get all sessions for this customer
    const sessions = await this.sessionRepository.find({
      where: { customer_id: customerId },
    });

    const totalConversations = sessions.length;
    const resolvedConversations = sessions.filter(s => s.status === 'resolved' || s.status === 'closed').length;
    const unresolvedConversations = totalConversations - resolvedConversations;

    // Get total message count
    const totalMessages = await this.messageRepository
      .createQueryBuilder('msg')
      .innerJoin('msg.session', 'session')
      .where('session.customer_id = :customerId', { customerId })
      .getCount();

    const avgMessagesPerConversation = totalConversations > 0
      ? parseFloat((totalMessages / totalConversations).toFixed(1))
      : 0;

    // Get last conversation date
    const lastSession = sessions.length > 0
      ? sessions.reduce((latest, current) =>
        current.updated_at > latest.updated_at ? current : latest
      )
      : null;

    return {
      data: {
        total_conversations: totalConversations,
        resolved_conversations: resolvedConversations,
        unresolved_conversations: unresolvedConversations,
        total_messages: totalMessages,
        avg_messages_per_conversation: avgMessagesPerConversation,
        most_common_intents: [],
        last_conversation_at: lastSession?.updated_at || null,
      },
    };
  }

  async getCustomerSupportTickets(
    customerId: number,
    page: number = 1,
    limit: number = 20,
    status?: string,
    priority?: string,
  ) {
    const customer = await this.customerRepository.findOne({
      where: { id: customerId },
    });

    if (!customer) {
      throw new NotFoundException('Không tìm thấy khách hàng');
    }

    const queryBuilder = this.ticketRepository
      .createQueryBuilder('ticket')
      .where('ticket.customer_id = :customerId', { customerId })
      .orderBy('ticket.created_at', 'DESC');

    // Filter by status if provided
    if (status) {
      queryBuilder.andWhere('ticket.status = :status', { status });
    }

    // Filter by priority if provided
    if (priority) {
      queryBuilder.andWhere('ticket.priority = :priority', { priority });
    }

    const total = await queryBuilder.getCount();
    const tickets = await queryBuilder
      .skip((page - 1) * limit)
      .take(limit)
      .getMany();

    return {
      data: tickets.map(ticket => ({
        id: ticket.id,
        customer_id: ticket.customer_id,
        customer_name: customer.name,
        customer_email: customer.email,
        subject: ticket.subject,
        message: ticket.message,
        status: ticket.status,
        priority: ticket.priority || 'medium',
        created_at: ticket.created_at,
        updated_at: ticket.updated_at,
        ai_attempted: false,
        assigned_admin_id: null,
        order_id: null,
      })),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getCustomerAddresses(customerId: number) {
    const customer = await this.customerRepository.findOne({
      where: { id: customerId },
    });

    if (!customer) {
      throw new NotFoundException('Không tìm thấy khách hàng');
    }

    const addresses = await this.addressRepository.find({
      where: { customer_id: customerId },
      order: { is_default: 'DESC', id: 'DESC' },
    });

    return {
      data: addresses.map(addr => ({
        id: addr.id,
        label: addr.address_type || 'Home',
        name: customer.name,
        address: addr.street_address,
        city: addr.province,
        district: addr.district,
        ward: addr.ward,
        phone: addr.phone_number,
        is_default: addr.is_default,
        created_at: new Date(),
      })),
    };
  }
}
