import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Product } from '../../entities/product.entity';
import { ProductVariant } from '../../entities/product-variant.entity';
import { Category } from '../../entities/category.entity';
import { PromotionProduct } from '../../entities/promotion-product.entity';
import { Promotion } from '../../entities/promotion.entity';
import { Review } from '../../entities/review.entity';
import { ProductNotification } from '../../entities/product-notification.entity';

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product)
    private productRepository: Repository<Product>,
    @InjectRepository(ProductVariant)
    private variantRepository: Repository<ProductVariant>,
    @InjectRepository(Category)
    private categoryRepository: Repository<Category>,
    @InjectRepository(PromotionProduct)
    private promotionProductRepository: Repository<PromotionProduct>,
    @InjectRepository(Promotion)
    private promotionRepository: Repository<Promotion>,
    @InjectRepository(Review)
    private reviewRepository: Repository<Review>,
    @InjectRepository(ProductNotification)
    private notificationRepository: Repository<ProductNotification>,
  ) { }

  async findAll(query: any) {
    const {
      category_slug,
      colors,
      sizes,
      min_price,
      max_price,
      sort_by = 'newest',
      search,
      page = 1,
      limit = 20,
      is_new_arrival,
      is_on_sale,
      attrs,
    } = query;

    const queryBuilder = this.productRepository
      .createQueryBuilder('product')
      .leftJoinAndSelect('product.category', 'category')
      .where('product.status = :status', { status: 'active' })
      .andWhere('product.deleted_at IS NULL');

    // Filter by category slug
    if (category_slug) {
      queryBuilder.andWhere('category.slug = :slug', { slug: category_slug });
    }

    // Filter by price range
    if (min_price || max_price) {
      if (min_price && max_price) {
        queryBuilder.andWhere('product.selling_price BETWEEN :minPrice AND :maxPrice', {
          minPrice: min_price,
          maxPrice: max_price,
        });
      } else if (min_price) {
        queryBuilder.andWhere('product.selling_price >= :minPrice', { minPrice: min_price });
      } else {
        queryBuilder.andWhere('product.selling_price <= :maxPrice', { maxPrice: max_price });
      }
    }

    // Search by name, description, or slug (with unaccent for Vietnamese text)
    if (search) {
      queryBuilder.andWhere(
        '(unaccent(product.name) ILIKE unaccent(:search) OR unaccent(product.description) ILIKE unaccent(:search) OR product.slug ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    // Filter by attributes (JSONB)
    if (attrs) {
      try {
        const attrsObj = typeof attrs === 'string' ? JSON.parse(attrs) : attrs;
        Object.keys(attrsObj).forEach((key, index) => {
          queryBuilder.andWhere(
            `product.attributes->>:key${index} = :value${index}`,
            { [`key${index}`]: key, [`value${index}`]: attrsObj[key] },
          );
        });
      } catch (error) {
        throw new BadRequestException('Invalid attrs format. Expected JSON string or object.');
      }
    }

    // Filter by colors/sizes (need to check variants)
    if (colors || sizes) {
      queryBuilder.innerJoin('product.variants', 'variant');
      queryBuilder.andWhere('variant.status = :variantStatus', { variantStatus: 'active' });

      if (colors) {
        // Parse colors: can be array, comma-separated string, or single value
        const colorArray = Array.isArray(colors)
          ? colors
          : typeof colors === 'string' && colors.includes(',')
            ? colors.split(',').map(c => c.trim())
            : [colors];

        // Check if colors are numeric IDs or color names
        const isNumeric = colorArray.every(c => !isNaN(Number(c)));

        if (isNumeric) {
          // Filter by color_id
          queryBuilder.andWhere('variant.color_id IN (:...colors)', { colors: colorArray });
        } else {
          // Filter by color name (join with color table)
          queryBuilder.innerJoin('variant.color', 'color');
          queryBuilder.andWhere('color.name IN (:...colorNames)', { colorNames: colorArray });
        }
      }

      if (sizes) {
        // Parse sizes: can be array, comma-separated string, or single value
        const sizeArray = Array.isArray(sizes)
          ? sizes
          : typeof sizes === 'string' && sizes.includes(',')
            ? sizes.split(',').map(s => s.trim())
            : [sizes];

        // Check if sizes are numeric IDs or size names
        const isNumeric = sizeArray.every(s => !isNaN(Number(s)));

        if (isNumeric) {
          // Filter by size_id
          queryBuilder.andWhere('variant.size_id IN (:...sizes)', { sizes: sizeArray });
        } else {
          // Filter by size name (join with size table)
          queryBuilder.innerJoin('variant.size', 'size');
          queryBuilder.andWhere('size.name IN (:...sizeNames)', { sizeNames: sizeArray });
        }
      }
    }

    // Filter new arrivals (last 30 days)
    if (is_new_arrival === 'true' || is_new_arrival === true) {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      queryBuilder.andWhere('product.created_at >= :date', { date: thirtyDaysAgo });
    }

    // Filter on-sale products (has active promotion)
    if (is_on_sale === 'true' || is_on_sale === true) {
      queryBuilder.innerJoin(
        'promotion_products',
        'pp',
        'pp.product_id = product.id',
      );
      queryBuilder.innerJoin(
        'promotions',
        'promo',
        'promo.id = pp.promotion_id AND promo.status = :promoStatus AND promo.type = :promoType AND promo.start_date <= :now AND promo.end_date >= :now',
        { promoStatus: 'active', promoType: 'flash_sale', now: new Date() },
      );
    }

    // Sorting
    switch (sort_by) {
      case 'price_asc':
        queryBuilder.orderBy('product.selling_price', 'ASC');
        break;
      case 'price_desc':
        queryBuilder.orderBy('product.selling_price', 'DESC');
        break;
      case 'rating':
        queryBuilder.orderBy('product.average_rating', 'DESC');
        break;
      case 'newest':
      default:
        queryBuilder.orderBy('product.created_at', 'DESC');
    }

    const skip = (page - 1) * limit;
    queryBuilder.skip(skip).take(limit);

    const [products, total] = await queryBuilder.getManyAndCount();

    // Get promotions for products
    const productIds = products.map(p => p.id);
    const promotions = await this.getActivePromotionsForProducts(productIds);

    // Map promotions to products
    const productsWithPromotions = products.map(product => ({
      ...product,
      flash_sale_price: promotions[product.id]?.flash_sale_price || null,
      promotion: promotions[product.id]?.promotion || null,
    }));

    return {
      data: productsWithPromotions,
      metadata: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findById(id: number) {
    // Get product by ID
    const product = await this.productRepository.findOne({
      where: { id: id as any, status: 'active', deleted_at: null },
      relations: ['category'],
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    return this.getProductDetails(product);
  }

  async findOne(slug: string) {
    // Get product by slug
    const product = await this.productRepository.findOne({
      where: { slug, status: 'active', deleted_at: null },
      relations: ['category'],
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    return this.getProductDetails(product);
  }

  private async getProductDetails(product: Product) {

    // Get all variants with size, color, and images
    const variants = await this.variantRepository.find({
      where: {
        product_id: product.id,
        status: 'active',
        deleted_at: null,
      },
      relations: ['size', 'color', 'images'],
      order: { size: { sort_order: 'ASC' } },
    });

    // Calculate available stock for each variant
    const variantsWithStock = variants.map(variant => ({
      ...variant,
      available_stock: variant.total_stock - variant.reserved_stock,
    }));

    // Get available colors and sizes
    const availableColors = [...new Map(
      variantsWithStock
        .filter(v => v.available_stock > 0)
        .map(v => [v.color_id, v.color])
    ).values()];

    const availableSizes = [...new Map(
      variantsWithStock
        .filter(v => v.available_stock > 0)
        .map(v => [v.size_id, v.size])
    ).values()];

    // Get promotion if exists
    const promotions = await this.getActivePromotionsForProducts([product.id]);
    const promotion = promotions[product.id] || null;

    // Get related products (same category)
    const relatedProducts = await this.productRepository.find({
      where: {
        category_id: product.category_id,
        status: 'active',
      },
      take: 4,
    });

    const relatedWithPromotions = await Promise.all(
      relatedProducts
        .filter(p => p.id !== product.id)
        .map(async (p) => {
          const promos = await this.getActivePromotionsForProducts([p.id]);
          return {
            ...p,
            flash_sale_price: promos[p.id]?.flash_sale_price || null,
          };
        }),
    );

    // Get approved reviews for this product
    const reviews = await this.reviewRepository
      .createQueryBuilder('r')
      .innerJoin('r.variant', 'v')
      .leftJoinAndSelect('r.customer', 'c')
      .where('v.product_id = :productId', { productId: product.id })
      .andWhere('r.status = :status', { status: 'approved' })
      .orderBy('r.created_at', 'DESC')
      .take(10)
      .getMany();

    return {
      product: {
        ...product,
        flash_sale_price: promotion?.flash_sale_price || null,
        promotion: promotion?.promotion || null,
        variants: variantsWithStock.map(variant => ({
          id: variant.id,
          variant_id: variant.id,
          sku: variant.sku,
          size: variant.size ? {
            id: variant.size.id,
            name: variant.size.name,
          } : null,
          color: variant.color ? {
            id: variant.color.id,
            name: variant.color.name,
            hex_code: variant.color.hex_code,
          } : null,
          total_stock: variant.total_stock,
          reserved_stock: variant.reserved_stock,
          available_stock: variant.available_stock,
          stock: variant.available_stock,
          status: variant.status,
          images: variant.images?.map(img => ({
            id: img.id,
            image_url: img.image_url,
            is_main: img.is_main,
          })) || [],
        })),
        colors: availableColors.map(color => color.name),
        available_options: {
          colors: availableColors.map(color => ({
            id: color.id,
            name: color.name,
            hex_code: color.hex_code,
            in_stock: true,
          })),
          sizes: availableSizes.map(size => ({
            id: size.id,
            name: size.name,
            in_stock: true,
          })),
        },
      },
      related_products: relatedWithPromotions,
      reviews,
    };
  }

  /**
   * Get active promotions for products
   */
  private async getActivePromotionsForProducts(
    productIds: number[],
  ): Promise<Record<number, { flash_sale_price: number; promotion: Promotion }>> {
    if (!productIds.length) return {};

    const now = new Date();
    const promotionProducts = await this.promotionProductRepository
      .createQueryBuilder('pp')
      .leftJoinAndSelect('pp.promotion', 'promotion')
      .where('pp.product_id IN (:...productIds)', { productIds })
      .andWhere('promotion.status = :status', { status: 'active' })
      .andWhere('promotion.type = :type', { type: 'flash_sale' })
      .andWhere('promotion.start_date <= :now', { now })
      .andWhere('promotion.end_date >= :now', { now })
      .getMany();

    const result: Record<number, { flash_sale_price: number; promotion: Promotion }> = {};
    promotionProducts.forEach(pp => {
      result[pp.product_id] = {
        flash_sale_price: pp.flash_sale_price,
        promotion: pp.promotion,
      };
    });

    return result;
  }

  async getAttributes() {
    // Get all distinct keys from attributes JSONB column
    const result = await this.productRepository
      .createQueryBuilder('product')
      .select('DISTINCT jsonb_object_keys(product.attributes)', 'key')
      .where('product.attributes IS NOT NULL')
      .andWhere('product.attributes != :empty', { empty: '{}' })
      .andWhere('product.deleted_at IS NULL')
      .getRawMany();

    const keys = result.map(r => r.key);

    return {
      attributes: keys,
      count: keys.length,
    };
  }

  async createNotification(productId: number, customerId: number, dto: any) {
    // Check if product exists
    const product = await this.productRepository.findOne({
      where: { id: productId, deleted_at: null },
    });

    if (!product) {
      throw new NotFoundException('Không tìm thấy sản phẩm');
    }

    // Generate unique ID for notification
    const notificationId = `notif_${Date.now()}_${Math.random().toString(36).substring(7)}`;

    // Create notification
    const notification = this.notificationRepository.create({
      id: notificationId,
      user_id: customerId,
      product_id: productId,
      size: dto.size || null,
      price_condition: dto.price_condition || null,
      status: 'active',
    });

    await this.notificationRepository.save(notification);

    return {
      message: 'Đăng ký nhận thông báo thành công',
      notification_id: notificationId,
    };
  }

  async checkAvailability(query: any) {
    const { name, size, color } = query;

    if (!name) {
      throw new BadRequestException('Vui lòng cung cấp tên sản phẩm');
    }

    // Tìm sản phẩm theo tên (fuzzy search với unaccent)
    const queryBuilder = this.productRepository
      .createQueryBuilder('product')
      .leftJoinAndSelect('product.variants', 'variants')
      .leftJoinAndSelect('variants.size', 'size')
      .leftJoinAndSelect('variants.color', 'color')
      .where('product.status = :status', { status: 'active' })
      .andWhere('product.deleted_at IS NULL')
      .andWhere('unaccent(product.name) ILIKE unaccent(:name)', { name: `%${name}%` });

    const products = await queryBuilder.getMany();

    if (products.length === 0) {
      return {
        status: 'not_found',
        message: 'Không tìm thấy sản phẩm',
        products: [],
      };
    }

    // Filter variants theo size và color nếu có
    const results = products.map(product => {
      let matchedVariants = product.variants.filter(v => v.status === 'active');

      if (size) {
        matchedVariants = matchedVariants.filter(
          v => v.size?.name?.toLowerCase() === size.toLowerCase()
        );
      }

      if (color) {
        matchedVariants = matchedVariants.filter(
          v => v.color?.name?.toLowerCase().includes(color.toLowerCase())
        );
      }

      const totalAvailable = matchedVariants.reduce(
        (sum, v) => sum + (v.total_stock - v.reserved_stock),
        0
      );

      return {
        product_id: product.id,
        product_name: product.name,
        slug: product.slug,
        price: product.selling_price,
        thumbnail: product.thumbnail_url,
        status: totalAvailable > 0 ? 'in_stock' : 'out_of_stock',
        quantity_left: totalAvailable,
        variants: matchedVariants.map(v => ({
          size: v.size?.name,
          color: v.color?.name,
          available: v.total_stock - v.reserved_stock,
        })),
      };
    });

    // Lọc ra các sản phẩm còn hàng
    const inStock = results.filter(r => r.status === 'in_stock');
    const outOfStock = results.filter(r => r.status === 'out_of_stock');

    return {
      found: results.length,
      in_stock: inStock.length,
      out_of_stock: outOfStock.length,
      products: [...inStock, ...outOfStock],
    };
  }

  async getFeatured(limit: number) {
    const products = await this.productRepository.find({
      where: { status: 'active', deleted_at: null },
      order: { average_rating: 'DESC', total_reviews: 'DESC' },
      take: limit,
    });

    return { products };
  }

  async getFilters(categoryId?: number) {
    const where: any = { status: 'active', deleted_at: null };
    if (categoryId) {
      where.category_id = categoryId;
    }

    // Get distinct sizes
    const sizesQuery = this.variantRepository
      .createQueryBuilder('variant')
      .leftJoin('variant.product', 'product')
      .leftJoin('variant.size', 'size')
      .where('product.status = :status', { status: 'active' })
      .andWhere('product.deleted_at IS NULL')
      .andWhere('variant.deleted_at IS NULL');

    if (categoryId) {
      sizesQuery.andWhere('product.category_id = :categoryId', { categoryId });
    }

    const sizes = await sizesQuery
      .select(['size.id', 'size.name'])
      .distinct(true)
      .getRawMany();

    // Get distinct colors
    const colorsQuery = this.variantRepository
      .createQueryBuilder('variant')
      .leftJoin('variant.product', 'product')
      .leftJoin('variant.color', 'color')
      .where('product.status = :status', { status: 'active' })
      .andWhere('product.deleted_at IS NULL')
      .andWhere('variant.deleted_at IS NULL');

    if (categoryId) {
      colorsQuery.andWhere('product.category_id = :categoryId', { categoryId });
    }

    const colors = await colorsQuery
      .select(['color.id', 'color.name', 'color.hex_code'])
      .distinct(true)
      .getRawMany();

    // Get price range
    const priceQuery = this.productRepository
      .createQueryBuilder('product')
      .where('product.status = :status', { status: 'active' })
      .andWhere('product.deleted_at IS NULL');

    if (categoryId) {
      priceQuery.andWhere('product.category_id = :categoryId', { categoryId });
    }

    const priceRange = await priceQuery
      .select('MIN(product.selling_price)', 'min')
      .addSelect('MAX(product.selling_price)', 'max')
      .getRawOne();

    return {
      sizes,
      colors,
      price_range: {
        min: priceRange.min || 0,
        max: priceRange.max || 0,
      },
    };
  }

  async getProductReviews(productId: number, query: any) {
    const { page = 1, limit = 10, sort = 'created_at', order = 'desc' } = query;

    // Get product to verify it exists
    const product = await this.productRepository.findOne({
      where: { id: productId, deleted_at: null },
    });

    if (!product) {
      throw new NotFoundException('Không tìm thấy sản phẩm');
    }

    // Get reviews through variants
    const reviewsQuery = this.reviewRepository
      .createQueryBuilder('review')
      .leftJoin('review.variant', 'variant')
      .leftJoin('variant.size', 'size')
      .leftJoin('variant.color', 'color')
      .leftJoin('review.customer', 'customer')
      .where('variant.product_id = :productId', { productId })
      .andWhere('review.status = :status', { status: 'approved' })
      .select([
        'review.id',
        'review.rating',
        'review.comment',
        'review.created_at',
        'customer.name',
        'size.name',
        'color.name',
      ]);

    if (sort === 'rating') {
      reviewsQuery.orderBy('review.rating', order.toUpperCase() as 'ASC' | 'DESC');
    } else {
      reviewsQuery.orderBy('review.created_at', order.toUpperCase() as 'ASC' | 'DESC');
    }

    const [reviews, total] = await reviewsQuery
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return {
      reviews,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getRelatedProducts(productId: number, limit: number) {
    const product = await this.productRepository.findOne({
      where: { id: productId, deleted_at: null },
    });

    if (!product) {
      throw new NotFoundException('Không tìm thấy sản phẩm');
    }

    const relatedProducts = await this.productRepository.find({
      where: {
        category_id: product.category_id,
        status: 'active',
        deleted_at: null,
      },
      take: limit + 1, // +1 để exclude product hiện tại
    });

    // Remove current product from results
    const filtered = relatedProducts.filter(p => p.id !== productId).slice(0, limit);

    return { products: filtered };
  }
}
