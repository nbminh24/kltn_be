import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Order } from '../../entities/order.entity';
import { User } from '../../entities/user.entity';
import { Product } from '../../entities/product.entity';
import { Category } from '../../entities/category.entity';
import { SupportTicket } from '../../entities/support-ticket.entity';
import { StaticPage } from '../../entities/static-page.entity';
import { ProductVariant } from '../../entities/product-variant.entity';
import { ProductImage } from '../../entities/product-image.entity';
import { Promotion } from '../../entities/promotion.entity';
import { ChatbotConversation } from '../../entities/chatbot-conversation.entity';
import { ChatbotMessage } from '../../entities/chatbot-message.entity';
import { AiRecommendation } from '../../entities/ai-recommendation.entity';
import { Customer } from '../../entities/customer.entity';
import { SupportTicketReply } from '../../entities/support-ticket-reply.entity';
import { RestockBatch } from '../../entities/restock-batch.entity';
import { RestockItem } from '../../entities/restock-item.entity';
import { OrderStatusHistory } from '../../entities/order-status-history.entity';
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
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Product)
    private productRepository: Repository<Product>,
    @InjectRepository(Category)
    private categoryRepository: Repository<Category>,
    @InjectRepository(SupportTicket)
    private ticketRepository: Repository<SupportTicket>,
    @InjectRepository(StaticPage)
    private pageRepository: Repository<StaticPage>,
    @InjectRepository(ProductVariant)
    private variantRepository: Repository<ProductVariant>,
    @InjectRepository(ProductImage)
    private imageRepository: Repository<ProductImage>,
    @InjectRepository(Promotion)
    private promotionRepository: Repository<Promotion>,
    @InjectRepository(ChatbotConversation)
    private conversationRepository: Repository<ChatbotConversation>,
    @InjectRepository(ChatbotMessage)
    private messageRepository: Repository<ChatbotMessage>,
    @InjectRepository(AiRecommendation)
    private recommendationRepository: Repository<AiRecommendation>,
    @InjectRepository(Customer)
    private customerRepository: Repository<Customer>,
    @InjectRepository(SupportTicketReply)
    private ticketReplyRepository: Repository<SupportTicketReply>,
    @InjectRepository(RestockBatch)
    private restockBatchRepository: Repository<RestockBatch>,
    @InjectRepository(RestockItem)
    private restockItemRepository: Repository<RestockItem>,
    @InjectRepository(OrderStatusHistory)
    private statusHistoryRepository: Repository<OrderStatusHistory>,
    private emailService: EmailService,
  ) {}

  // ==================== DASHBOARD ====================
  async getDashboardStats() {
    const totalOrders = await this.orderRepository.count();
    const totalUsers = await this.userRepository.count();
    const totalProducts = await this.productRepository.count();

    const orders = await this.orderRepository.find({
      order: { created_at: 'DESC' },
      take: 10,
      relations: ['user'],
    });

    const totalRevenue = await this.orderRepository
      .createQueryBuilder('order')
      .select('SUM(order.total)', 'total')
      .where('order.status != :status', { status: 'Cancelled' })
      .getRawOne();

    return {
      stats: {
        totalOrders,
        totalUsers,
        totalProducts,
        totalRevenue: parseFloat(totalRevenue?.total || 0),
      },
      recentOrders: orders,
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
      .createQueryBuilder('order')
      .leftJoinAndSelect('order.user', 'user')
      .leftJoinAndSelect('order.items', 'items')
      .leftJoinAndSelect('items.product', 'product');

    // Filter by status
    if (query.status) {
      queryBuilder.andWhere('order.status = :status', { status: query.status });
    }

    // Filter by customer email
    if (query.customer_email) {
      queryBuilder.andWhere('user.email ILIKE :email', { email: `%${query.customer_email}%` });
    }

    const [orders, total] = await queryBuilder
      .orderBy('order.created_at', 'DESC')
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

  // ==================== CUSTOMERS MANAGEMENT ====================
  async getCustomers(query: any) {
    const page = parseInt(query.page) || 1;
    const limit = parseInt(query.limit) || 20;
    const skip = (page - 1) * limit;

    const queryBuilder = this.userRepository
      .createQueryBuilder('user')
      .leftJoin('user.orders', 'orders')
      .addSelect('COUNT(orders.id)', 'ordersCount')
      .addSelect('COALESCE(SUM(orders.total), 0)', 'totalSpent')
      .groupBy('user.id');

    // Search
    if (query.search) {
      queryBuilder.andWhere('(user.name ILIKE :search OR user.email ILIKE :search)', {
        search: `%${query.search}%`,
      });
    }

    const [customers, total] = await queryBuilder
      .orderBy('user.created_at', 'DESC')
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

  async getCustomerById(id: string) {
    const customer = await this.userRepository.findOne({
      where: { id },
    });

    if (!customer) {
      throw new NotFoundException('Không tìm thấy khách hàng');
    }

    // Calculate total spent and orders count
    const totalSpentResult = await this.orderRepository
      .createQueryBuilder('order')
      .select('COALESCE(SUM(order.total_amount), 0)', 'total')
      .addSelect('COUNT(order.id)', 'count')
      .where('order.customer_id = :customerId', { customerId: id })
      .andWhere('order.fulfillment_status != :status', { status: 'cancelled' })
      .getRawOne();

    return {
      data: {
        ...customer,
        totalSpent: parseFloat(totalSpentResult?.total || '0'),
        ordersCount: parseInt(totalSpentResult?.count || '0'),
      },
    };
  }

  // ==================== SUPPORT & CONTENT MANAGEMENT ====================
  async updateTicket(id: number, updateTicketDto: UpdateTicketDto) {
    const ticket = await this.ticketRepository.findOne({ where: { id } });

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
    page.last_modified = new Date();
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
      .select([
        'variant.id',
        'variant.sku',
        'variant.color',
        'variant.size',
        'variant.stock',
        'product.id',
        'product.name',
        'product.sku',
      ]);

    if (lowStockOnly) {
      queryBuilder.where('variant.stock < :threshold', { threshold: 10 });
    }

    const variants = await queryBuilder
      .orderBy('variant.stock', 'ASC')
      .getMany();

    return {
      data: variants,
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
      .orderBy('promotion.created_at', 'DESC');

    // Filter by status
    if (query.status) {
      queryBuilder.andWhere('promotion.status = :status', { status: query.status });
    }

    // Filter by code (search)
    if (query.search) {
      queryBuilder.andWhere('promotion.code ILIKE :search', {
        search: `%${query.search}%`,
      });
    }

    // Filter active promotions only
    if (query.active === 'true') {
      queryBuilder
        .andWhere('promotion.status = :status', { status: 'Active' })
        .andWhere(
          '(promotion.expiry_date IS NULL OR promotion.expiry_date >= CURRENT_DATE)',
        )
        .andWhere(
          '(promotion.usage_limit IS NULL OR promotion.usage_count < promotion.usage_limit)',
        );
    }

    const [promotions, total] = await queryBuilder
      .skip(skip)
      .take(limit)
      .getManyAndCount();

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

    const queryBuilder = this.conversationRepository
      .createQueryBuilder('conv')
      .leftJoinAndSelect('conv.user', 'user')
      .orderBy('conv.updated_at', 'DESC');

    // Filter by resolved status
    if (query.resolved !== undefined) {
      queryBuilder.andWhere('conv.resolved = :resolved', { 
        resolved: query.resolved === 'true' 
      });
    }

    // Search in last_message
    if (query.search) {
      queryBuilder.andWhere('conv.last_message ILIKE :search', {
        search: `%${query.search}%`,
      });
    }

    const [conversations, total] = await queryBuilder
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    return {
      conversations,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getChatbotConversationDetail(id: string) {
    const conversation = await this.conversationRepository.findOne({
      where: { id },
      relations: ['user'],
    });

    if (!conversation) {
      throw new NotFoundException('Không tìm thấy conversation');
    }

    // Get all messages
    const messages = await this.messageRepository.find({
      where: { conversation_id: id },
      order: { timestamp: 'ASC' },
    });

    return {
      conversation,
      messages,
      message_count: messages.length,
    };
  }

  async getChatbotAnalytics() {
    // Total conversations
    const totalConversations = await this.conversationRepository.count();

    // Resolved vs Unresolved
    const resolvedCount = await this.conversationRepository.count({
      where: { resolved: true },
    });

    const unresolvedCount = totalConversations - resolvedCount;
    const resolvedRate = totalConversations > 0 
      ? parseFloat(((resolvedCount / totalConversations) * 100).toFixed(2))
      : 0;

    // Total messages
    const totalMessages = await this.messageRepository.count();

    // Average messages per conversation
    const avgMessagesPerConv = totalConversations > 0
      ? parseFloat((totalMessages / totalConversations).toFixed(2))
      : 0;

    // Fallback rate (messages without intent or with fallback intent)
    const fallbackMessages = await this.messageRepository
      .createQueryBuilder('msg')
      .leftJoin('msg.conversation', 'conv')
      .where('conv.intent IS NULL OR conv.intent = :fallback', { fallback: 'fallback' })
      .getCount();

    const fallbackRate = totalMessages > 0
      ? parseFloat(((fallbackMessages / totalMessages) * 100).toFixed(2))
      : 0;

    // Top intents
    const topIntents = await this.conversationRepository
      .createQueryBuilder('conv')
      .select('conv.intent', 'intent')
      .addSelect('COUNT(*)', 'count')
      .where('conv.intent IS NOT NULL')
      .andWhere('conv.intent != :fallback', { fallback: 'fallback' })
      .groupBy('conv.intent')
      .orderBy('count', 'DESC')
      .limit(10)
      .getRawMany();

    // Daily activity (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const dailyActivity = await this.conversationRepository
      .createQueryBuilder('conv')
      .select('DATE(conv.created_at)', 'date')
      .addSelect('COUNT(*)', 'conversations')
      .where('conv.created_at >= :startDate', { startDate: thirtyDaysAgo })
      .groupBy('DATE(conv.created_at)')
      .orderBy('date', 'ASC')
      .getRawMany();

    return {
      overview: {
        total_conversations: totalConversations,
        total_messages: totalMessages,
        avg_messages_per_conversation: avgMessagesPerConv,
        resolved_count: resolvedCount,
        unresolved_count: unresolvedCount,
        resolved_rate: resolvedRate,
        fallback_rate: fallbackRate,
      },
      top_intents: topIntents,
      daily_activity: dailyActivity,
    };
  }

  async getChatbotUnanswered() {
    // Get unresolved conversations with high message count (user struggling)
    const conversations = await this.conversationRepository
      .createQueryBuilder('conv')
      .leftJoinAndSelect('conv.user', 'user')
      .where('conv.resolved = :resolved', { resolved: false })
      .andWhere('conv.message_count >= :minMessages', { minMessages: 3 })
      .orderBy('conv.message_count', 'DESC')
      .take(50)
      .getMany();

    return {
      unanswered_conversations: conversations,
      count: conversations.length,
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

    const [recommendations, total] = await queryBuilder
      .skip(skip)
      .take(limit)
      .getManyAndCount();

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
        const quantity = parseInt(row.quantity || row.Quantity);

        if (!sku || !quantity || quantity <= 0) {
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

    const [tickets, total] = await queryBuilder
      .skip(skip)
      .take(parseInt(limit))
      .getManyAndCount();

    return {
      data: tickets,
      metadata: {
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
      where: { id: customerId },
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
  async updateOrderStatusWithEmail(orderId: number, status: string, adminId?: number) {
    const order = await this.orderRepository.findOne({
      where: { id: orderId },
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
    });
    await this.statusHistoryRepository.save(history);

    // Send email notification
    try {
      const statusTexts = {
        pending: 'đang chờ xử lý',
        processing: 'đang được xử lý',
        shipped: 'đã được giao cho đơn vị vận chuyển',
        delivered: 'đã được giao thành công',
        cancelled: 'đã bị hủy',
      };

      await this.emailService.sendMail({
        to: order.customer_email,
        subject: `Đơn hàng #${order.id} ${statusTexts[status]}`,
        template: 'order-status-update',
        context: {
          orderId: order.id,
          newStatus: status,
          statusText: statusTexts[status],
          totalAmount: order.total_amount,
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
}
