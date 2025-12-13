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
import { ProductSearchDto } from './dto/product-search.dto';

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

  private normalizeText(input?: string | null) {
    if (!input) return '';
    return input
      .toString()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();
  }

  private clamp01(value: number) {
    if (Number.isNaN(value) || !Number.isFinite(value)) return 0;
    return Math.min(1, Math.max(0, value));
  }

  private computeProductScore(params: {
    q?: string;
    category?: string;
    colors?: string[];
    sizes?: string[];
    min_price?: number;
    max_price?: number;
    in_stock?: boolean;
    product: Product;
  }) {
    const { q, category, colors, sizes, min_price, max_price, in_stock, product } = params;

    // heuristic-based relevance scoring, explainable & reproducible
    const WEIGHTS = {
      name: 0.45,
      category: 0.15,
      attributes: 0.15,
      description: 0.10,
      color: 0.10,
      size: 0.05,
    };

    const matched_on: string[] = [];

    const qNorm = this.normalizeText(q);
    const tokens = qNorm
      .split(/[^a-z0-9]+/g)
      .map(t => t.trim())
      .filter(t => t.length >= 2);

    const nameNorm = this.normalizeText(product.name);
    const slugNorm = this.normalizeText(product.slug);
    const catNameNorm = this.normalizeText(product.category?.name);
    const catSlugNorm = this.normalizeText(product.category?.slug as any);
    const descNorm = this.normalizeText(product.description);
    const fullDescNorm = this.normalizeText(product.full_description);
    const attrsNorm = this.normalizeText(product.attributes ? JSON.stringify(product.attributes) : '');

    const colorNamesNorm = (product.variants || [])
      .map(v => v.color?.name)
      .filter(Boolean)
      .map(cn => this.normalizeText(cn));
    const sizeNamesNorm = (product.variants || [])
      .map(v => v.size?.name)
      .filter(Boolean)
      .map(sn => this.normalizeText(sn));

    const availableStock = (product.variants || []).reduce(
      (sum, v) => sum + Math.max(0, (v.total_stock || 0) - (v.reserved_stock || 0)),
      0,
    );
    const productInStock = availableStock > 0;

    let nameMatchScore = 0;
    if (qNorm) {
      if (nameNorm.includes(qNorm) || slugNorm.includes(qNorm)) {
        nameMatchScore = 1;
      } else if (tokens.length > 0) {
        const hits = tokens.filter(t => nameNorm.includes(t) || slugNorm.includes(t)).length;
        nameMatchScore = hits / tokens.length;
      }
    }
    if (nameMatchScore > 0) matched_on.push('name');

    let categoryMatchScore = 0;
    const categoryNorm = this.normalizeText(category);
    if (categoryNorm) {
      if (catSlugNorm && catSlugNorm.includes(categoryNorm)) categoryMatchScore = 1;
      else if (catNameNorm && catNameNorm.includes(categoryNorm)) categoryMatchScore = 0.8;
    } else if (qNorm) {
      if (catNameNorm && (catNameNorm.includes(qNorm) || tokens.some(t => catNameNorm.includes(t)))) {
        categoryMatchScore = 0.6;
      }
    }
    if (categoryMatchScore > 0) matched_on.push('category');

    let attributesMatchScore = 0;
    if (qNorm && attrsNorm) {
      if (attrsNorm.includes(qNorm)) {
        attributesMatchScore = 1;
      } else if (tokens.length > 0) {
        const hits = tokens.filter(t => attrsNorm.includes(t)).length;
        attributesMatchScore = hits / tokens.length;
      }
    }
    if (attributesMatchScore > 0) matched_on.push('attributes');

    let descMatchScore = 0;
    if (qNorm) {
      const combined = `${descNorm} ${fullDescNorm}`.trim();
      if (combined.includes(qNorm)) {
        descMatchScore = 1;
      } else if (tokens.length > 0) {
        const hits = tokens.filter(t => combined.includes(t)).length;
        descMatchScore = hits / tokens.length;
      }
    }
    if (descMatchScore > 0) matched_on.push('description');

    let colorMatchScore = 0;
    let matchedColor: string | null = null;
    if (colors && colors.length > 0) {
      const requested = colors.map(c => this.normalizeText(c)).filter(Boolean);
      if (requested.length > 0) {
        const hits = requested.filter(rc => colorNamesNorm.some(pc => pc.includes(rc))).length;
        colorMatchScore = hits / requested.length;

        if (hits > 0) {
          const firstMatch = requested.find(rc => colorNamesNorm.some(pc => pc.includes(rc)));
          if (firstMatch) {
            const matchedIndex = colorNamesNorm.findIndex(pc => pc.includes(firstMatch));
            matchedColor = matchedIndex >= 0 ? (product.variants || [])[matchedIndex]?.color?.name || null : null;
            if (!matchedColor) {
              matchedColor = firstMatch;
            }
          }
        }
      }
      if (colorMatchScore > 0) matched_on.push('color');
    } else if (qNorm) {
      if (colorNamesNorm.some(cn => cn.includes(qNorm) || tokens.some(t => cn.includes(t)))) {
        colorMatchScore = 0.4;
        matched_on.push('color');
      }
    }

    let sizeMatchScore = 0;
    let matchedSize: string | null = null;
    if (sizes && sizes.length > 0) {
      const requested = sizes.map(s => this.normalizeText(s)).filter(Boolean);
      if (requested.length > 0) {
        const hits = requested.filter(rs => sizeNamesNorm.some(ps => ps === rs || ps.includes(rs))).length;
        sizeMatchScore = hits / requested.length;

        if (hits > 0) {
          const firstMatch = requested.find(rs => sizeNamesNorm.some(ps => ps === rs || ps.includes(rs)));
          if (firstMatch) {
            const matchedIndex = sizeNamesNorm.findIndex(ps => ps === firstMatch || ps.includes(firstMatch));
            matchedSize = matchedIndex >= 0 ? (product.variants || [])[matchedIndex]?.size?.name || null : null;
            if (!matchedSize) {
              matchedSize = firstMatch;
            }
          }
        }
      }
      if (sizeMatchScore > 0) matched_on.push('size');
    } else if (qNorm) {
      if (sizeNamesNorm.some(sn => sn === qNorm || tokens.some(t => sn === t))) {
        sizeMatchScore = 0.3;
        matched_on.push('size');
      }
    }

    // If user requests in_stock, ensure explainability when product qualifies
    if (in_stock === true && productInStock) {
      matched_on.push('in_stock');
    }

    // Price explainability when product is within range
    const price = Number(product.selling_price);
    const withinMin = min_price === undefined || min_price === null ? true : price >= Number(min_price);
    const withinMax = max_price === undefined || max_price === null ? true : price <= Number(max_price);
    if ((min_price !== undefined && min_price !== null) || (max_price !== undefined && max_price !== null)) {
      if (withinMin && withinMax) matched_on.push('price');
    }

    const scoreRaw =
      WEIGHTS.name * this.clamp01(nameMatchScore) +
      WEIGHTS.category * this.clamp01(categoryMatchScore) +
      WEIGHTS.attributes * this.clamp01(attributesMatchScore) +
      WEIGHTS.description * this.clamp01(descMatchScore) +
      WEIGHTS.color * this.clamp01(colorMatchScore) +
      WEIGHTS.size * this.clamp01(sizeMatchScore);

    const score = this.clamp01(scoreRaw);

    // Remove duplicates while keeping order
    const matched_unique: string[] = [];
    for (const m of matched_on) {
      if (!matched_unique.includes(m)) matched_unique.push(m);
    }

    return {
      score,
      matched_on: matched_unique,
      matched_details: {
        color: matchedColor,
        size: matchedSize,
        price_range:
          (min_price !== undefined && min_price !== null) || (max_price !== undefined && max_price !== null)
            ? {
              min: min_price ?? null,
              max: max_price ?? null,
            }
            : null,
      },
      in_stock: productInStock,
    };
  }

  async searchProductsForChatbot(dto: ProductSearchDto) {
    const startedAt = Date.now();
    const request_id = `req_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
    const {
      q,
      category,
      colors,
      sizes,
      min_price,
      max_price,
      in_stock,
      limit,
    } = dto;

    const safeLimit = limit || 5;
    const candidateLimit = Math.min(50, Math.max(10, safeLimit * 5));

    const qb = this.productRepository
      .createQueryBuilder('p')
      .leftJoinAndSelect('p.category', 'cat')
      .leftJoinAndSelect('p.variants', 'v')
      .leftJoinAndSelect('v.size', 's')
      .leftJoinAndSelect('v.color', 'co')
      .leftJoinAndSelect('v.images', 'i')
      .where('p.status = :status', { status: 'active' });

    if (q) {
      // Search on name/category/description/slug/attributes
      // Make matching tolerant to hyphens/underscores/spaces (e.g. "relaxed fit" vs "relaxed-fit")
      const qWildcard = `%${q.toString().trim().replace(/[\s\-_]+/g, '%')}%`;
      const tokens = q
        .toString()
        .trim()
        .split(/[^\p{L}\p{N}]+/gu)
        .map(t => t.trim())
        .filter(t => t.length >= 2)
        .slice(0, 6);

      const tokenClauses: string[] = [];
      const tokenParams: Record<string, any> = {};
      tokens.forEach((t, idx) => {
        const key = `qt_${idx}`;
        tokenClauses.push(`unaccent(p.name) ILIKE unaccent(:${key})`);
        tokenClauses.push(`p.slug ILIKE :${key}`);
        tokenClauses.push(`unaccent(p.description) ILIKE unaccent(:${key})`);
        tokenClauses.push(`unaccent(p.full_description) ILIKE unaccent(:${key})`);
        tokenClauses.push(`unaccent(cat.name) ILIKE unaccent(:${key})`);
        tokenClauses.push(`unaccent(p.attributes::text) ILIKE unaccent(:${key})`);
        tokenParams[key] = `%${t}%`;
      });

      qb.andWhere(
        `(
          unaccent(p.name) ILIKE unaccent(:qWildcard)
          OR unaccent(p.description) ILIKE unaccent(:qWildcard)
          OR unaccent(p.full_description) ILIKE unaccent(:qWildcard)
          OR p.slug ILIKE :qWildcard
          OR unaccent(cat.name) ILIKE unaccent(:qWildcard)
          OR unaccent(p.attributes::text) ILIKE unaccent(:qWildcard)
          ${tokens.length > 0 ? `OR (${tokenClauses.join(' OR ')})` : ''}
        )`,
        {
          qWildcard,
          ...tokenParams,
        },
      );
    }

    if (category) {
      const categoryLike = `%${category.toString().trim().replace(/[\s\-_]+/g, '%')}%`;
      qb.andWhere(
        '(unaccent(cat.slug) ILIKE unaccent(:categoryLike) OR unaccent(cat.name) ILIKE unaccent(:categoryLike))',
        { categoryLike },
      );
    }

    if (min_price !== undefined && min_price !== null) {
      qb.andWhere('p.selling_price >= :min_price', { min_price });
    }

    if (max_price !== undefined && max_price !== null) {
      qb.andWhere('p.selling_price <= :max_price', { max_price });
    }

    if (colors && colors.length > 0) {
      const clauses: string[] = [];
      const params: Record<string, any> = {};
      colors.forEach((c, idx) => {
        const key = `color_${idx}`;
        clauses.push(`unaccent(co.name) ILIKE unaccent(:${key})`);
        params[key] = `%${c}%`;
      });
      qb.andWhere(`(${clauses.join(' OR ')})`, params);
    }

    if (sizes && sizes.length > 0) {
      const clauses: string[] = [];
      const params: Record<string, any> = {};
      sizes.forEach((sName, idx) => {
        const key = `size_${idx}`;
        clauses.push(`s.name ILIKE :${key}`);
        params[key] = `%${sName}%`;
      });
      qb.andWhere(`(${clauses.join(' OR ')})`, params);
    }

    if (in_stock === true) {
      qb.andWhere('v.total_stock > v.reserved_stock');
    }

    // Total distinct products (for academic metrics)
    const qbCount = qb.clone().select('p.id').distinct(true);
    const total = await qbCount.getCount();

    const products = await qb.take(candidateLimit).getMany();

    const ranked = products
      .map(p => {
        const scoring = this.computeProductScore({
          q,
          category,
          colors,
          sizes,
          min_price,
          max_price,
          in_stock,
          product: p,
        });

        const availableSizes = [...new Set((p.variants || []).map(v => v.size?.name).filter(Boolean))];
        const availableColors = [...new Set((p.variants || []).map(v => v.color?.id).filter(Boolean))]
          .map(colorId => {
            const v = (p.variants || []).find(vv => vv.color?.id === colorId);
            if (!v || !v.color) return null;
            return {
              name: v.color.name,
              hex: v.color.hex_code || null,
            };
          })
          .filter(Boolean) as Array<{ name: string; hex: string | null }>;

        const images = (p.variants || [])
          .flatMap(v => v.images || [])
          .slice(0, 3)
          .map(img => img.image_url);

        return {
          id: p.id,
          name: p.name,
          slug: p.slug,
          thumbnail_url: p.thumbnail_url || images[0] || null,
          selling_price: p.selling_price,
          available_colors: availableColors,
          available_sizes: availableSizes,
          in_stock: scoring.in_stock,
          score: scoring.score,
          matched_on: scoring.matched_on,
          matched_details: scoring.matched_details,
        };
      })
      .sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        const ap = Number(a.selling_price);
        const bp = Number(b.selling_price);
        if (!Number.isNaN(ap) && !Number.isNaN(bp) && ap !== bp) return ap - bp;
        return String(a.id).localeCompare(String(b.id));
      })
      .slice(0, safeLimit);

    return {
      products: ranked,
      total,
      request_id,
      query_time_ms: Date.now() - startedAt,
    };
  }

  async getProductById(productId: number) {
    const product = await this.productRepository.findOne({
      where: { id: productId, status: 'active' },
      relations: ['category', 'variants', 'variants.size', 'variants.color', 'variants.images'],
    });

    if (!product) {
      throw new NotFoundException(`Product with ID ${productId} not found`);
    }

    const variants = (product.variants || []).map(v => {
      const availableStock = (v.total_stock || 0) - (v.reserved_stock || 0);
      return {
        id: v.id,
        product_id: product.id,
        color_id: v.color_id,
        color_name: v.color?.name || null,
        color_hex: v.color?.hex_code || null,
        size_id: v.size_id,
        size_name: v.size?.name || null,
        sku: v.sku,
        stock: availableStock,
        price: product.selling_price,
        images: (v.images || []).map(img => img.image_url),
      };
    });

    return {
      id: product.id,
      name: product.name,
      slug: product.slug,
      description: product.description,
      price: product.selling_price,
      thumbnail: product.thumbnail_url,
      category: product.category?.name || null,
      variants,
    };
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
      // Smart extraction: detect potential slug patterns in the search text
      // Pattern: lowercase words with hyphens (e.g., "ao-khoac-nam-lightweight")
      const slugPattern = /([a-z0-9]+(?:-[a-z0-9]+){2,})/gi;
      const slugMatches = search.match(slugPattern);

      if (slugMatches && slugMatches.length > 0) {
        // If slug pattern detected, search with both full text and extracted slug
        const slugSearch = slugMatches[0]; // Use first/longest slug match
        queryBuilder.andWhere(
          '(unaccent(p.name) ILIKE unaccent(:search) OR unaccent(p.description) ILIKE unaccent(:search) OR p.slug ILIKE :search OR p.slug ILIKE :slugSearch)',
          {
            search: `%${search}%`,
            slugSearch: `%${slugSearch}%`
          },
        );
      } else {
        // Normal search with unaccent for Vietnamese text matching
        queryBuilder.andWhere(
          '(unaccent(p.name) ILIKE unaccent(:search) OR unaccent(p.description) ILIKE unaccent(:search) OR p.slug ILIKE :search)',
          { search: `%${search}%` },
        );
      }
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

        const variants = p.variants?.map(v => ({
          id: v.id,
          variant_id: v.id,
          size: v.size?.name || null,
          color: v.color?.name || null,
          stock: v.total_stock - v.reserved_stock,
        })) || [];

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
          variants: variants,
          colors: availableColors,
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
