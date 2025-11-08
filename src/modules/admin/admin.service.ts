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
import { CreateProductDto } from './dto/create-product.dto';
import { IdGenerator } from '../../common/utils/id-generator';
import { UpdateProductDto } from './dto/update-product.dto';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { UpdateTicketDto } from './dto/update-ticket.dto';
import { UpdatePageDto } from './dto/update-page.dto';

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
    // Check SKU uniqueness
    const existingProduct = await this.productRepository.findOne({
      where: { sku: createProductDto.sku },
    });

    if (existingProduct) {
      throw new BadRequestException('SKU đã tồn tại trong hệ thống');
    }

    // Generate ID and slug
    const id = `prod_${Date.now()}`;
    const slug = this.generateSlug(createProductDto.name);

    // Extract variants and images from DTO
    const { variants, images, ...productData } = createProductDto;

    const product = this.productRepository.create({
      id,
      slug,
      ...productData,
      rating: 0,
      reviews_count: 0,
      sold_count: 0,
      ai_indexed: false,
    });

    await this.productRepository.save(product);

    // Create variants if provided
    const createdVariants = [];
    if (variants && variants.length > 0) {
      for (const variantData of variants) {
        const variant = this.variantRepository.create({
          id: IdGenerator.generate('var'),
          product_id: product.id,
          ...variantData,
        });
        await this.variantRepository.save(variant);
        createdVariants.push(variant);
      }
    }

    // Create images if provided
    const createdImages = [];
    if (images && images.length > 0) {
      for (let i = 0; i < images.length; i++) {
        const imageData = images[i];
        const image = this.imageRepository.create({
          id: IdGenerator.generate('img'),
          product_id: product.id,
          image_url: imageData.image_url,
          is_primary: imageData.is_primary ?? (i === 0), // First image is primary by default
          display_order: imageData.display_order ?? i,
        });
        await this.imageRepository.save(image);
        createdImages.push(image);
      }
    }

    return {
      message: 'Tạo sản phẩm thành công',
      data: {
        ...product,
        variants: createdVariants,
        images: createdImages,
      },
    };
  }

  async updateProduct(id: string, updateProductDto: UpdateProductDto) {
    const product = await this.productRepository.findOne({ where: { id } });

    if (!product) {
      throw new NotFoundException('Không tìm thấy sản phẩm');
    }

    // Update slug if name changed
    if (updateProductDto.name && updateProductDto.name !== product.name) {
      product.slug = this.generateSlug(updateProductDto.name);
    }

    Object.assign(product, updateProductDto);
    await this.productRepository.save(product);

    return {
      message: 'Cập nhật sản phẩm thành công',
      data: product,
    };
  }

  // ==================== CATEGORIES MANAGEMENT ====================
  async getCategories() {
    const categories = await this.categoryRepository.find({
      order: { created_at: 'DESC' },
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
      id,
      slug,
      ...createCategoryDto,
      products_count: 0,
    });

    await this.categoryRepository.save(category);

    return {
      message: 'Tạo danh mục thành công',
      data: category,
    };
  }

  async updateCategory(id: string, updateCategoryDto: UpdateCategoryDto) {
    const category = await this.categoryRepository.findOne({ where: { id } });

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
    const order = await this.orderRepository.findOne({ where: { id } });

    if (!order) {
      throw new NotFoundException('Không tìm thấy đơn hàng');
    }

    order.status = status;
    await this.orderRepository.save(order);

    return {
      message: `Cập nhật trạng thái đơn hàng thành ${status}`,
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
      relations: ['orders', 'addresses'],
    });

    if (!customer) {
      throw new NotFoundException('Không tìm thấy khách hàng');
    }

    // Calculate total spent
    const totalSpentResult = await this.orderRepository
      .createQueryBuilder('order')
      .select('COALESCE(SUM(order.total), 0)', 'total')
      .where('order.user_id = :userId', { userId: id })
      .andWhere('order.status != :status', { status: 'Cancelled' })
      .getRawOne();

    return {
      data: {
        ...customer,
        totalSpent: parseFloat(totalSpentResult?.total || 0),
        ordersCount: customer.orders?.length || 0,
      },
    };
  }

  // ==================== SUPPORT & CONTENT MANAGEMENT ====================
  async updateTicket(id: string, updateTicketDto: UpdateTicketDto) {
    const ticket = await this.ticketRepository.findOne({ where: { id } });

    if (!ticket) {
      throw new NotFoundException('Không tìm thấy ticket');
    }

    // If admin reply is provided, update replied_at
    if (updateTicketDto.admin_reply) {
      ticket.replied_at = new Date();
    }

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
      lowStockCount: variants.filter(v => v.stock < 10).length,
    };
  }

  // ==================== PRODUCT VARIANTS MANAGEMENT ====================
  async createVariant(productId: string, variantData: any) {
    const product = await this.productRepository.findOne({ where: { id: productId } });
    if (!product) {
      throw new NotFoundException('Không tìm thấy sản phẩm');
    }

    // Check SKU uniqueness
    const existingVariant = await this.variantRepository.findOne({
      where: { sku: variantData.sku },
    });
    if (existingVariant) {
      throw new BadRequestException('SKU biến thể đã tồn tại');
    }

    const variant = this.variantRepository.create({
      id: IdGenerator.generate('var'),
      product_id: productId,
      ...variantData,
    });

    await this.variantRepository.save(variant);

    return {
      message: 'Tạo biến thể thành công',
      data: variant,
    };
  }

  async updateVariant(productId: string, variantId: string, updateData: any) {
    const variant = await this.variantRepository.findOne({
      where: { id: variantId, product_id: productId },
    });

    if (!variant) {
      throw new NotFoundException('Không tìm thấy biến thể');
    }

    Object.assign(variant, updateData);
    await this.variantRepository.save(variant);

    return {
      message: 'Cập nhật biến thể thành công',
      data: variant,
    };
  }

  async deleteVariant(productId: string, variantId: string) {
    const result = await this.variantRepository.delete({
      id: variantId,
      product_id: productId,
    });

    if (result.affected === 0) {
      throw new NotFoundException('Không tìm thấy biến thể');
    }

    return {
      message: 'Xóa biến thể thành công',
    };
  }

  // ==================== PRODUCT IMAGES MANAGEMENT ====================
  async createImage(productId: string, imageData: any) {
    const product = await this.productRepository.findOne({ where: { id: productId } });
    if (!product) {
      throw new NotFoundException('Không tìm thấy sản phẩm');
    }

    // Get current images count for display_order
    const imagesCount = await this.imageRepository.count({
      where: { product_id: productId },
    });

    const image = this.imageRepository.create({
      id: IdGenerator.generate('img'),
      product_id: productId,
      image_url: imageData.image_url,
      is_primary: imageData.is_primary ?? false,
      display_order: imageData.display_order ?? imagesCount,
    });

    await this.imageRepository.save(image);

    return {
      message: 'Thêm ảnh thành công',
      data: image,
    };
  }

  async updateImage(productId: string, imageId: string, updateData: any) {
    const image = await this.imageRepository.findOne({
      where: { id: imageId, product_id: productId },
    });

    if (!image) {
      throw new NotFoundException('Không tìm thấy ảnh');
    }

    Object.assign(image, updateData);
    await this.imageRepository.save(image);

    return {
      message: 'Cập nhật ảnh thành công',
      data: image,
    };
  }

  async deleteImage(productId: string, imageId: string) {
    const result = await this.imageRepository.delete({
      id: imageId,
      product_id: productId,
    });

    if (result.affected === 0) {
      throw new NotFoundException('Không tìm thấy ảnh');
    }

    return {
      message: 'Xóa ảnh thành công',
    };
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

  async getPromotionById(id: string) {
    const promotion = await this.promotionRepository.findOne({ where: { id } });

    if (!promotion) {
      throw new NotFoundException('Không tìm thấy mã giảm giá');
    }

    return { promotion };
  }

  async createPromotion(createPromotionDto: any) {
    // Validate code format
    const code = createPromotionDto.code.toUpperCase().trim();
    
    if (!/^[A-Z0-9]{3,20}$/.test(code)) {
      throw new BadRequestException(
        'Mã giảm giá phải là chữ IN HOA, không dấu, 3-20 ký tự',
      );
    }

    // Check code uniqueness
    const existingPromotion = await this.promotionRepository.findOne({
      where: { code },
    });

    if (existingPromotion) {
      throw new BadRequestException('Mã giảm giá đã tồn tại');
    }

    // Validate discount_value based on type
    if (createPromotionDto.type === 'percentage') {
      if (createPromotionDto.discount_value < 1 || createPromotionDto.discount_value > 100) {
        throw new BadRequestException('Giảm giá theo % phải từ 1-100');
      }
    } else if (createPromotionDto.discount_value <= 0) {
      throw new BadRequestException('Giá trị giảm giá phải lớn hơn 0');
    }

    // Validate dates
    if (createPromotionDto.start_date && createPromotionDto.expiry_date) {
      const startDate = new Date(createPromotionDto.start_date);
      const expiryDate = new Date(createPromotionDto.expiry_date);
      
      if (startDate >= expiryDate) {
        throw new BadRequestException('Ngày hết hạn phải sau ngày bắt đầu');
      }
    }

    const promotion = this.promotionRepository.create({
      id: IdGenerator.generate('promo'),
      code,
      ...createPromotionDto,
      usage_count: 0,
    });

    await this.promotionRepository.save(promotion);

    return {
      message: 'Tạo mã giảm giá thành công',
      data: promotion,
    };
  }

  async updatePromotion(id: string, updatePromotionDto: any) {
    const promotion = await this.promotionRepository.findOne({ where: { id } });

    if (!promotion) {
      throw new NotFoundException('Không tìm thấy mã giảm giá');
    }

    // Validate discount_value if updating
    if (updatePromotionDto.type || updatePromotionDto.discount_value) {
      const type = updatePromotionDto.type || promotion.type;
      const value = updatePromotionDto.discount_value || promotion.discount_value;

      if (type === 'percentage' && (value < 1 || value > 100)) {
        throw new BadRequestException('Giảm giá theo % phải từ 1-100');
      } else if (type === 'fixed' && value <= 0) {
        throw new BadRequestException('Giá trị giảm giá phải lớn hơn 0');
      }
    }

    // Validate dates if updating
    if (updatePromotionDto.start_date || updatePromotionDto.expiry_date) {
      const startDate = new Date(updatePromotionDto.start_date || promotion.start_date);
      const expiryDate = new Date(updatePromotionDto.expiry_date || promotion.expiry_date);
      
      if (startDate && expiryDate && startDate >= expiryDate) {
        throw new BadRequestException('Ngày hết hạn phải sau ngày bắt đầu');
      }
    }

    Object.assign(promotion, updatePromotionDto);
    await this.promotionRepository.save(promotion);

    return {
      message: 'Cập nhật mã giảm giá thành công',
      data: promotion,
    };
  }

  async deletePromotion(id: string) {
    const result = await this.promotionRepository.delete(id);

    if (result.affected === 0) {
      throw new NotFoundException('Không tìm thấy mã giảm giá');
    }

    return {
      message: 'Xóa mã giảm giá thành công',
    };
  }

  async togglePromotionStatus(id: string) {
    const promotion = await this.promotionRepository.findOne({ where: { id } });

    if (!promotion) {
      throw new NotFoundException('Không tìm thấy mã giảm giá');
    }

    promotion.status = promotion.status === 'Active' ? 'Inactive' : 'Active';
    await this.promotionRepository.save(promotion);

    return {
      message: `Đã ${promotion.status === 'Active' ? 'kích hoạt' : 'vô hiệu hóa'} mã giảm giá`,
      data: promotion,
    };
  }

  async getPromotionUsageStats(code: string) {
    const promotion = await this.promotionRepository.findOne({ where: { code } });

    if (!promotion) {
      throw new NotFoundException('Không tìm thấy mã giảm giá');
    }

    const remainingUsage = promotion.usage_limit 
      ? promotion.usage_limit - promotion.usage_count 
      : null;

    const isActive = 
      promotion.status === 'Active' &&
      (!promotion.expiry_date || new Date(promotion.expiry_date) >= new Date()) &&
      (!promotion.usage_limit || promotion.usage_count < promotion.usage_limit);

    return {
      promotion,
      stats: {
        usage_count: promotion.usage_count,
        usage_limit: promotion.usage_limit,
        remaining_usage: remainingUsage,
        is_active: isActive,
        is_expired: promotion.expiry_date && new Date(promotion.expiry_date) < new Date(),
        is_usage_limit_reached: promotion.usage_limit && promotion.usage_count >= promotion.usage_limit,
      },
    };
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
