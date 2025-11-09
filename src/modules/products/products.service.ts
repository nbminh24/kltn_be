import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Product } from '../../entities/product.entity';
import { ProductVariant } from '../../entities/product-variant.entity';
import { Category } from '../../entities/category.entity';
import { PromotionProduct } from '../../entities/promotion-product.entity';
import { Promotion } from '../../entities/promotion.entity';

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
  ) {}

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
    } = query;

    const queryBuilder = this.productRepository
      .createQueryBuilder('product')
      .leftJoinAndSelect('product.category', 'category')
      .where('product.status = :status', { status: 'active' });

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

    // Search by name or description
    if (search) {
      queryBuilder.andWhere(
        '(product.name ILIKE :search OR product.description ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    // Filter by colors/sizes (need to check variants)
    if (colors || sizes) {
      queryBuilder.innerJoin('product.variants', 'variant');
      queryBuilder.andWhere('variant.status = :variantStatus', { variantStatus: 'active' });

      if (colors) {
        const colorArray = Array.isArray(colors) ? colors : [colors];
        queryBuilder.andWhere('variant.color_id IN (:...colors)', { colors: colorArray });
      }

      if (sizes) {
        const sizeArray = Array.isArray(sizes) ? sizes : [sizes];
        queryBuilder.andWhere('variant.size_id IN (:...sizes)', { sizes: sizeArray });
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

  async findOne(slug: string) {
    // Get product by slug
    const product = await this.productRepository.findOne({
      where: { slug, status: 'active' },
      relations: ['category'],
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    // Get all variants with size, color, and images
    const variants = await this.variantRepository.find({
      where: {
        product_id: product.id,
        status: 'active',
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

    return {
      product: {
        ...product,
        flash_sale_price: promotion?.flash_sale_price || null,
        promotion: promotion?.promotion || null,
      },
      variants: variantsWithStock,
      available_options: {
        colors: availableColors,
        sizes: availableSizes,
      },
      related_products: relatedWithPromotions,
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
}
