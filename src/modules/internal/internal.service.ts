import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like } from 'typeorm';
import { Order } from '../../entities/order.entity';
import { Product } from '../../entities/product.entity';
import { ProductVariant } from '../../entities/product-variant.entity';
import { Page } from '../../entities/page.entity';
import { Customer } from '../../entities/customer.entity';
import { Promotion } from '../../entities/promotion.entity';
import { SupportTicket } from '../../entities/support-ticket.entity';
import { ProductNotification } from '../../entities/product-notification.entity';
import { IdGenerator } from '../../common/utils/id-generator';
import { SizingAdviceDto } from './dto/sizing-advice.dto';
import { ValidateDiscountDto } from './dto/validate-discount.dto';
import { SubscribeNotificationDto } from './dto/subscribe-notification.dto';
import { CreateTicketInternalDto } from './dto/create-ticket-internal.dto';

@Injectable()
export class InternalService {
  constructor(
    @InjectRepository(Order)
    private orderRepository: Repository<Order>,
    @InjectRepository(Product)
    private productRepository: Repository<Product>,
    @InjectRepository(ProductVariant)
    private variantRepository: Repository<ProductVariant>,
    @InjectRepository(Page)
    private pageRepository: Repository<Page>,
    @InjectRepository(Customer)
    private customerRepository: Repository<Customer>,
    @InjectRepository(Promotion)
    private promotionRepository: Repository<Promotion>,
    @InjectRepository(SupportTicket)
    private ticketRepository: Repository<SupportTicket>,
    @InjectRepository(ProductNotification)
    private notificationRepository: Repository<ProductNotification>,
  ) { }

  async getOrderById(orderId: string) {
    throw new BadRequestException('Please use /api/v1/orders endpoints');
  }

  async searchProducts(options: { search?: string; category?: string; limit?: number }) {
    const { search, category, limit = 10 } = options;

    const queryBuilder = this.productRepository
      .createQueryBuilder('p')
      .leftJoinAndSelect('p.category', 'c')
      .leftJoinAndSelect('p.variants', 'v')
      .leftJoinAndSelect('v.size', 's')
      .leftJoinAndSelect('v.color', 'co')
      .leftJoinAndSelect('v.images', 'i')
      .where('p.status = :status', { status: 'active' })
      .take(limit);

    if (search) {
      queryBuilder.andWhere(
        '(p.name ILIKE :search OR p.description ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    if (category) {
      queryBuilder.andWhere('c.slug = :category', { category });
    }

    const products = await queryBuilder.getMany();

    return {
      products: products.map(p => {
        const totalStock = p.variants?.reduce((sum, v) => sum + (v.total_stock || 0), 0) || 0;
        const availableSizes = [...new Set(p.variants?.map(v => v.size?.name).filter(Boolean))];
        const availableColors = [...new Set(p.variants?.map(v => v.color?.name).filter(Boolean))];
        const images = p.variants?.flatMap(v => v.images || []).slice(0, 3).map(img => img.image_url) || [];

        return {
          id: p.id,
          name: p.name,
          slug: p.slug,
          description: p.description || '',
          selling_price: p.selling_price,
          total_stock: totalStock,
          category_name: p.category?.name || null,
          thumbnail_url: p.thumbnail_url || (images[0] || null),
          available_sizes: availableSizes,
          available_colors: availableColors,
          images: images,
        };
      }),
      count: products.length,
    };
  }

  async getPageBySlug(slug: string) {
    const page = await this.pageRepository.findOne({ where: { slug } });

    if (!page) {
      throw new NotFoundException(`Page with slug "${slug}" not found`);
    }

    return {
      slug: page.slug,
      title: page.title,
      body_content: page.content,
      status: page.status,
    };
  }

  async searchFaq(query: string) {
    const pages = await this.pageRepository.find({
      where: [
        { slug: Like(`%${query}%`), status: 'Published' },
        { title: Like(`%${query}%`), status: 'Published' },
        { content: Like(`%${query}%`), status: 'Published' },
      ],
      take: 5,
    });

    return {
      results: pages.map(p => ({
        slug: p.slug,
        title: p.title,
        content: p.content.substring(0, 500),
      })),
      count: pages.length,
    };
  }

  async getUserByEmail(email: string) {
    const customer = await this.customerRepository.findOne({
      where: { email },
      select: ['id', 'name', 'email'],
    });

    if (!customer) {
      throw new NotFoundException('Customer not found');
    }

    return { customer };
  }

  async getCustomerOrders(options: { email: string }) {
    const { email } = options;

    if (!email) {
      throw new BadRequestException('Email là bắt buộc');
    }

    const customer = await this.customerRepository.findOne({
      where: { email },
      select: ['id', 'name', 'email'],
    });

    if (!customer) {
      return {
        customer: null,
        orders: [],
        message: 'Không tìm thấy khách hàng',
      };
    }

    const orders = await this.orderRepository.find({
      where: { customer_id: Number(customer.id) },
      order: { created_at: 'DESC' },
      take: 10,
      relations: ['items', 'items.variant', 'items.variant.product'],
    });

    return {
      customer: {
        name: customer.name,
        email: customer.email,
      },
      orders: orders.map(order => ({
        id: order.id,
        order_id: order.id,
        status: order.fulfillment_status,
        payment_status: order.payment_status,
        total_amount: order.total_amount,
        created_at: order.created_at,
        items_count: order.items?.length || 0,
        items: order.items?.map(item => ({
          product_name: item.variant?.product?.name || 'N/A',
          quantity: item.quantity,
          price_at_purchase: item.price_at_purchase,
        })) || [],
      })),
      total_orders: orders.length,
    };
  }

  /**
   * Search Variants
   */
  async searchVariants(params: {
    product_id?: number;
    sku?: string;
    size?: string;
    color?: string;
    in_stock?: boolean;
    limit?: number;
  }) {
    const { product_id, sku, size, color, in_stock, limit = 20 } = params;

    const queryBuilder = this.variantRepository
      .createQueryBuilder('v')
      .leftJoinAndSelect('v.product', 'p')
      .leftJoinAndSelect('v.size', 's')
      .leftJoinAndSelect('v.color', 'c')
      .leftJoinAndSelect('v.images', 'img')
      .leftJoinAndSelect('p.category', 'cat')
      .where('v.status = :status', { status: 'active' })
      .andWhere('p.status = :pStatus', { pStatus: 'active' });

    if (product_id) {
      queryBuilder.andWhere('v.product_id = :product_id', { product_id });
    }

    if (sku) {
      queryBuilder.andWhere('v.sku ILIKE :sku', { sku: `%${sku}%` });
    }

    if (size) {
      queryBuilder.andWhere('s.name ILIKE :size', { size: `%${size}%` });
    }

    if (color) {
      queryBuilder.andWhere('c.name ILIKE :color', { color: `%${color}%` });
    }

    if (in_stock === true) {
      queryBuilder.andWhere('v.total_stock > v.reserved_stock');
    }

    const variants = await queryBuilder.limit(limit).getMany();

    return {
      variants: variants.map(v => ({
        variant_id: v.id,
        product_id: v.product_id,
        product_name: v.product?.name,
        product_slug: v.product?.slug,
        variant_name: v.name,
        sku: v.sku,
        size: v.size?.name || null,
        color: v.color?.name || null,
        color_hex: v.color?.hex_code || null,
        total_stock: v.total_stock,
        reserved_stock: v.reserved_stock,
        available_stock: v.total_stock - v.reserved_stock,
        status: v.status,
        price: v.product?.selling_price,
        category: v.product?.category?.name,
        images: v.images?.map(img => img.image_url) || [],
        main_image: v.images?.find(img => img.is_main)?.image_url || v.images?.[0]?.image_url || null,
      })),
      count: variants.length,
    };
  }

  /**
   * ==================== CHATBOT INTERNAL APIs ====================
   */

  /**
   * API 1: Tư vấn Size (PHÂN BIỆT THEO CATEGORY)
   */
  async getSizingAdvice(dto: SizingAdviceDto) {
    const { product_id, height, weight } = dto;

    const product = await this.productRepository.findOne({
      where: { id: product_id },
      relations: ['category', 'variants', 'variants.size'],
    });

    if (!product) {
      throw new NotFoundException('Không tìm thấy sản phẩm');
    }

    const bmi = weight / Math.pow(height / 100, 2);
    const categoryName = product.category?.name?.toLowerCase() || '';

    let recommendedSize: string;
    let reason: string;

    // LOGIC PHÂN BIỆT THEO CATEGORY
    if (categoryName.includes('áo') || categoryName.includes('shirt') || categoryName.includes('jacket')) {
      // LOGIC CHO ÁO
      if (bmi < 18.5) {
        recommendedSize = height < 165 ? 'S' : height < 175 ? 'M' : 'L';
        reason = `Với chiều cao ${height}cm và BMI ${bmi.toFixed(1)}, size ${recommendedSize} áo sẽ vừa vặn, không bị rộng.`;
      } else if (bmi < 25) {
        recommendedSize = height < 160 ? 'S' : height < 170 ? 'M' : height < 180 ? 'L' : 'XL';
        reason = `Size ${recommendedSize} phù hợp với vóc dáng cân đối của bạn, thoải mái ở vòng ngực.`;
      } else {
        recommendedSize = height < 165 ? 'M' : height < 175 ? 'L' : 'XL';
        reason = `Size ${recommendedSize} sẽ thoải mái nhất, đảm bảo không bị chật ở vòng ngực và bụng.`;
      }
    } else if (categoryName.includes('quần') || categoryName.includes('pant') || categoryName.includes('jean')) {
      // LOGIC CHO QUẦN
      if (bmi < 18.5) {
        recommendedSize = height < 165 ? 'S' : height < 175 ? 'M' : 'L';
        reason = `Với chiều cao ${height}cm, size ${recommendedSize} quần sẽ vừa vòng eo và chiều dài phù hợp.`;
      } else if (bmi < 25) {
        recommendedSize = height < 160 ? 'S' : height < 170 ? 'M' : height < 180 ? 'L' : 'XL';
        reason = `Size ${recommendedSize} cân đối với vòng eo và chiều dài quần phù hợp với chiều cao của bạn.`;
      } else {
        recommendedSize = height < 165 ? 'L' : height < 175 ? 'XL' : 'XXL';
        reason = `Size ${recommendedSize} thoải mái ở vòng eo, đảm bảo không bị chật khi ngồi.`;
      }
    } else if (categoryName.includes('giày') || categoryName.includes('shoe')) {
      // LOGIC CHO GIÀY
      if (height < 160) {
        recommendedSize = '38-39';
        reason = 'Size giày phù hợp với chiều cao của bạn.';
      } else if (height < 170) {
        recommendedSize = '39-40';
        reason = 'Size giày phổ biến cho chiều cao của bạn.';
      } else if (height < 180) {
        recommendedSize = '41-42';
        reason = 'Size giày tương ứng với chiều cao của bạn.';
      } else {
        recommendedSize = '42-43';
        reason = 'Size giày phù hợp với người cao.';
      }
    } else {
      // LOGIC CHUNG
      if (bmi < 18.5) {
        recommendedSize = height < 165 ? 'S' : height < 175 ? 'M' : 'L';
        reason = `Size ${recommendedSize} phù hợp với vóc dáng của bạn.`;
      } else if (bmi < 25) {
        recommendedSize = height < 160 ? 'S' : height < 170 ? 'M' : height < 180 ? 'L' : 'XL';
        reason = `Size ${recommendedSize} cân đối nhất với chiều cao và cân nặng của bạn.`;
      } else {
        recommendedSize = height < 165 ? 'M' : height < 175 ? 'L' : 'XL';
        reason = `Size ${recommendedSize} sẽ thoải mái nhất.`;
      }
    }

    // Check stock
    const availableVariants = product.variants?.filter(v =>
      v.size?.name === recommendedSize && v.total_stock > 0
    ) || [];

    if (availableVariants.length === 0) {
      const allSizes = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];
      const currentIndex = allSizes.indexOf(recommendedSize);
      let alternativeSize = null;

      for (let i = 1; i < allSizes.length; i++) {
        const nextIdx = currentIndex + i;
        const prevIdx = currentIndex - i;

        if (nextIdx < allSizes.length) {
          const hasStock = product.variants?.some(v =>
            v.size?.name === allSizes[nextIdx] && v.total_stock > 0
          );
          if (hasStock) {
            alternativeSize = allSizes[nextIdx];
            break;
          }
        }

        if (prevIdx >= 0) {
          const hasStock = product.variants?.some(v =>
            v.size?.name === allSizes[prevIdx] && v.total_stock > 0
          );
          if (hasStock) {
            alternativeSize = allSizes[prevIdx];
            break;
          }
        }
      }

      if (alternativeSize) {
        return {
          recommended_size: alternativeSize,
          reason: `${reason} Tuy nhiên size ${recommendedSize} hết hàng, bạn có thể chọn size ${alternativeSize}.`,
          original_recommendation: recommendedSize,
          in_stock: true,
          category: product.category?.name,
        };
      }

      return {
        recommended_size: recommendedSize,
        reason: `${reason} Tuy nhiên sản phẩm hiện hết hàng.`,
        in_stock: false,
        category: product.category?.name,
      };
    }

    return {
      recommended_size: recommendedSize,
      reason,
      in_stock: true,
      category: product.category?.name,
    };
  }

  /**
   * API 2: Tư vấn Phối đồ
   */
  async getStylingRules(productId: number) {
    const product = await this.productRepository.findOne({
      where: { id: productId },
      relations: ['category'],
    });

    if (!product) {
      throw new NotFoundException('Không tìm thấy sản phẩm');
    }

    const categoryName = product.category?.name?.toLowerCase() || '';
    const recommendations = [];

    if (categoryName.includes('áo sơ mi') || categoryName.includes('shirt')) {
      recommendations.push(
        { type: 'category', value: 'Quần Tây', reason: 'Phối quần tây tạo phong cách lịch sự' },
        { type: 'category', value: 'Quần Jeans', reason: 'Kết hợp quần jeans phong cách trẻ trung' },
        { type: 'category', value: 'Giày Da', reason: 'Hoàn thiện với giày da thanh lịch' }
      );
    } else if (categoryName.includes('áo thun') || categoryName.includes('t-shirt')) {
      recommendations.push(
        { type: 'category', value: 'Quần Jeans', reason: 'Combo kinh điển' },
        { type: 'category', value: 'Quần Short', reason: 'Năng động cho ngày hè' },
        { type: 'category', value: 'Áo Khoác', reason: 'Thêm áo khoác tạo điểm nhấn' }
      );
    } else if (categoryName.includes('quần jean') || categoryName.includes('jeans')) {
      recommendations.push(
        { type: 'category', value: 'Áo Thun', reason: 'Đơn giản luôn hợp mốt' },
        { type: 'category', value: 'Áo Sơ Mi', reason: 'Phong cách smart casual' },
        { type: 'category', value: 'Áo Khoác', reason: 'Layer cho ngày lạnh' }
      );
    } else {
      recommendations.push(
        { type: 'category', value: 'Áo Thun', reason: 'Món basic dễ phối' },
        { type: 'category', value: 'Quần Jeans', reason: 'Không lỗi mốt' }
      );
    }

    const colorTips = [];
    const nameLower = product.name.toLowerCase();
    if (nameLower.includes('đen') || nameLower.includes('black')) {
      colorTips.push('Đen dễ phối với mọi màu', 'Phối trắng tạo tương phản');
    } else if (nameLower.includes('trắng') || nameLower.includes('white')) {
      colorTips.push('Trắng trung tính phối đẹp', 'Tránh toàn trắng');
    } else {
      colorTips.push('Phối màu trung tính luôn an toàn');
    }

    return {
      product_name: product.name,
      category: product.category?.name,
      recommendations,
      color_tips: colorTips,
    };
  }

  /**
   * API 3: Top Discounts
   */
  async getTopDiscounts(limit: number = 20) {
    const products = await this.productRepository
      .createQueryBuilder('p')
      .leftJoinAndSelect('p.category', 'c')
      .where('p.cost_price IS NOT NULL')
      .andWhere('p.cost_price > p.selling_price')
      .andWhere('p.status = :status', { status: 'active' })
      .getMany();

    const productsWithDiscount = products.map(p => {
      const costPrice = parseFloat(p.cost_price.toString());
      const sellingPrice = parseFloat(p.selling_price.toString());
      const discountPercent = ((costPrice - sellingPrice) / costPrice) * 100;

      return {
        product_id: p.id,
        product_name: p.name,
        slug: p.slug,
        original_price: costPrice,
        selling_price: sellingPrice,
        discount_percent: Math.round(discountPercent),
        save_amount: costPrice - sellingPrice,
        category: p.category?.name || null,
        thumbnail_url: p.thumbnail_url,
      };
    });

    productsWithDiscount.sort((a, b) => b.discount_percent - a.discount_percent);

    return {
      top_discounts: productsWithDiscount.slice(0, limit),
      count: productsWithDiscount.length,
    };
  }

  /**
   * API 4: Subscribe Notification
   */
  async subscribeNotification(dto: SubscribeNotificationDto) {
    const { product_id, user_id, size, price_condition } = dto;

    const product = await this.productRepository.findOne({ where: { id: product_id } });
    if (!product) throw new NotFoundException('Không tìm thấy sản phẩm');

    // Check customer exists (dùng customer thay vì user)
    const customer = await this.customerRepository.findOne({ where: { id: user_id } });
    if (!customer) throw new NotFoundException('Không tìm thấy người dùng');

    const existing = await this.notificationRepository.findOne({
      where: {
        user_id,
        product_id,
        size: size || null,
        status: 'active',
      },
    });

    if (existing) {
      return {
        success: true,
        message: 'Bạn đã đăng ký nhận thông báo!',
        notification_id: existing.id,
      };
    }

    const notification = this.notificationRepository.create({
      id: IdGenerator.generate('notif'),
      user_id,
      product_id,
      size,
      price_condition,
      status: 'active',
    });

    await this.notificationRepository.save(notification);

    let message = 'Mình sẽ báo bạn khi ';
    if (size) message += `có hàng size ${size}`;
    else message += 'sản phẩm có hàng';
    if (price_condition) message += ` hoặc giá giảm xuống ${price_condition.toLocaleString('vi-VN')}₫`;
    message += '!';

    return {
      success: true,
      message,
      notification_id: notification.id,
    };
  }

  /**
   * API 5: Create Ticket
   */
  async createTicketInternal(dto: CreateTicketInternalDto) {
    const { order_id, user_id, issue_type, product_sku, description } = dto;

    // Check customer exists (dùng customer thay vì user)
    const customer = await this.customerRepository.findOne({ where: { id: user_id } });
    if (!customer) throw new NotFoundException('Không tìm thấy người dùng');

    const subjectMap: Record<string, string> = {
      missing_item: 'Thiếu sản phẩm',
      wrong_item: 'Giao sai sản phẩm',
      damaged_item: 'Sản phẩm bị hỏng',
      late_delivery: 'Giao hàng chậm',
      other: 'Vấn đề khác',
    };

    const subject = subjectMap[issue_type] || 'Khiếu nại từ chatbot';

    let message = `${description}\n\nLoại vấn đề: ${subjectMap[issue_type]}\n`;
    if (order_id) message += `Mã đơn: ${order_id}\n`;
    if (product_sku) message += `SKU: ${product_sku}\n`;
    message += `\n(Ticket từ chatbot)`;

    // Generate unique ticket_code
    const ticketCode = `TICKET-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

    const ticket = this.ticketRepository.create({
      ticket_code: ticketCode,
      customer_id: user_id,
      subject,
      message,
      status: 'pending',
      priority: ['damaged_item', 'wrong_item'].includes(issue_type) ? 'high' : 'medium',
      source: 'chatbot',
    });

    await this.ticketRepository.save(ticket);

    return {
      ticket_id: ticket.id,
      message: 'Phiếu hỗ trợ đã được tạo!',
      status: ticket.status,
      priority: ticket.priority,
    };
  }
}
