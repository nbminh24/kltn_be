import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, In } from 'typeorm';
import { Product } from '../../entities/product.entity';
import { ProductVariant } from '../../entities/product-variant.entity';
import { ProductImage } from '../../entities/product-image.entity';
import { Size } from '../../entities/size.entity';
import { Color } from '../../entities/color.entity';
import { OrderItem } from '../../entities/order-item.entity';
import { Review } from '../../entities/review.entity';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { UpdateProductStatusDto } from './dto/update-product-status.dto';
import { QueryBuilderService } from '../../common/services/query-builder.service';
import { SlugService } from '../../common/services/slug.service';

@Injectable()
export class AdminProductsService {
  constructor(
    @InjectRepository(Product)
    private productRepository: Repository<Product>,
    @InjectRepository(ProductVariant)
    private variantRepository: Repository<ProductVariant>,
    @InjectRepository(ProductImage)
    private imageRepository: Repository<ProductImage>,
    @InjectRepository(Size)
    private sizeRepository: Repository<Size>,
    @InjectRepository(Color)
    private colorRepository: Repository<Color>,
    @InjectRepository(OrderItem)
    private orderItemRepository: Repository<OrderItem>,
    @InjectRepository(Review)
    private reviewRepository: Repository<Review>,
    private dataSource: DataSource,
    private queryBuilderService: QueryBuilderService,
    private slugService: SlugService,
  ) {}

  // GET /api/v1/admin/products - Paginated list with filters
  async findAll(query: any) {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 20;

    const queryBuilder = this.productRepository
      .createQueryBuilder('product')
      .leftJoinAndSelect('product.category', 'category')
      .leftJoin('product.variants', 'variant')
      .addSelect('SUM(variant.total_stock)', 'total_stock')
      .groupBy('product.id')
      .addGroupBy('category.id');

    // Apply filters
    this.queryBuilderService.applyFilters(
      queryBuilder,
      {
        category_id: query.category_id,
        status: query.status,
      },
      'product',
      ['category_id', 'status'],
    );

    // Apply search
    this.queryBuilderService.applySearch(queryBuilder, query.search, 'product', ['name', 'slug']);

    // Apply sorting
    this.queryBuilderService.applySort(queryBuilder, query.sort, 'product', [
      'name',
      'selling_price',
      'created_at',
    ]);

    // Apply pagination
    this.queryBuilderService.applyPagination(queryBuilder, { page, limit });

    const [rawResults, total] = await Promise.all([
      queryBuilder.getRawAndEntities(),
      queryBuilder.getCount(),
    ]);

    const data = rawResults.entities.map((product, index) => ({
      id: product.id,
      name: product.name,
      thumbnail_url: product.thumbnail_url,
      category_name: product.category?.name || null,
      selling_price: product.selling_price,
      total_stock: parseInt(rawResults.raw[index]?.total_stock) || 0,
      status: product.status,
    }));

    return {
      data,
      metadata: this.queryBuilderService.buildMetadata(total, page, limit),
    };
  }

  // GET /api/v1/admin/products/:id - Product detail
  async findOne(id: number) {
    const product = await this.productRepository.findOne({
      where: { id: id as any },
      relations: ['category'],
    });

    if (!product) {
      throw new NotFoundException('Sản phẩm không tồn tại');
    }

    // Get variants with full relationships (size, color, images)
    const variants = await this.variantRepository.find({
      where: { product_id: product.id as any },
      relations: ['size', 'color', 'images'],
      order: {
        size: { sort_order: 'ASC' },
        color: { name: 'ASC' },
      },
    });

    const selectedSizeIds = [...new Set(variants.map(v => v.size_id).filter(Boolean))];
    const selectedColorIds = [...new Set(variants.map(v => v.color_id).filter(Boolean))];

    // Format variants for response
    const formattedVariants = variants.map(v => ({
      id: v.id,
      product_id: v.product_id,
      sku: v.sku,
      size_id: v.size_id,
      color_id: v.color_id,
      total_stock: v.total_stock,
      reserved_stock: v.reserved_stock,
      reorder_point: v.reorder_point,
      status: v.status,
      version: v.version,
      size: v.size
        ? {
            id: v.size.id,
            name: v.size.name,
            sort_order: v.size.sort_order,
          }
        : null,
      color: v.color
        ? {
            id: v.color.id,
            name: v.color.name,
            hex_code: v.color.hex_code,
          }
        : null,
      images: v.images
        ? v.images.map(img => ({
            id: img.id,
            variant_id: img.variant_id,
            image_url: img.image_url,
            is_main: img.is_main,
          }))
        : [],
    }));

    const variantIds = variants.map(v => v.id);

    // Calculate total sold from order_items
    let totalSold = 0;
    if (variantIds.length > 0) {
      const soldResult = await this.orderItemRepository
        .createQueryBuilder('oi')
        .select('SUM(oi.quantity)', 'total')
        .innerJoin('oi.order', 'o')
        .where('oi.variant_id IN (:...variantIds)', { variantIds })
        .andWhere('o.fulfillment_status = :status', { status: 'delivered' })
        .getRawOne();
      totalSold = parseInt(soldResult?.total || '0');
    }

    // Calculate reviews stats
    let totalReviews = 0;
    let averageRating = 0;
    if (variantIds.length > 0) {
      const reviewsResult = await this.reviewRepository
        .createQueryBuilder('r')
        .select('COUNT(*)', 'total')
        .addSelect('AVG(r.rating)', 'avg_rating')
        .where('r.variant_id IN (:...variantIds)', { variantIds })
        .andWhere('r.status = :status', { status: 'approved' })
        .getRawOne();
      totalReviews = parseInt(reviewsResult?.total || '0');
      averageRating = parseFloat(reviewsResult?.avg_rating || '0');
    }

    return {
      id: product.id,
      name: product.name,
      description: product.description,
      full_description: product.full_description,
      cost_price: product.cost_price,
      selling_price: product.selling_price,
      status: product.status,
      category_id: product.category_id,
      thumbnail_url: product.thumbnail_url,
      selected_size_ids: selectedSizeIds,
      selected_color_ids: selectedColorIds,
      variants: formattedVariants,
      total_sold: totalSold,
      total_reviews: totalReviews,
      average_rating: averageRating,
    };
  }

  // POST /api/v1/admin/products - Create product with variants (TRANSACTION)
  async create(createProductDto: CreateProductDto) {
    // Validate sizes and colors exist
    await this.validateSizesAndColors(
      createProductDto.selected_size_ids,
      createProductDto.selected_color_ids,
    );

    // Auto-generate SKUs if not provided
    for (const variant of createProductDto.variants) {
      if (!variant.sku) {
        variant.sku = await this.generateSKU(
          createProductDto.name,
          variant.color_id,
          variant.size_id,
        );
      }
    }

    // Validate SKUs are unique
    await this.validateSKUs(createProductDto.variants.map(v => v.sku));

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Generate unique slug
      const slug = await this.slugService.generateUniqueSlug(
        createProductDto.name,
        async (slug: string) => {
          const exists = await this.productRepository.findOne({ where: { slug } });
          return !!exists;
        },
      );

      // 1. Insert product
      const product = queryRunner.manager.create(Product, {
        name: createProductDto.name,
        slug,
        description: createProductDto.description,
        full_description: createProductDto.full_description,
        cost_price: createProductDto.cost_price,
        selling_price: createProductDto.selling_price,
        category_id: createProductDto.category_id,
        status: createProductDto.status || 'active',
      });

      const savedProduct = await queryRunner.manager.save(product);

      // 2. Insert variants
      const variantsToCreate = createProductDto.variants.map(v =>
        queryRunner.manager.create(ProductVariant, {
          product_id: savedProduct.id,
          size_id: v.size_id,
          color_id: v.color_id,
          sku: v.sku,
          status: v.status || 'active',
          total_stock: v.stock || 0,
          reserved_stock: 0,
          reorder_point: 0,
        }),
      );

      await queryRunner.manager.save(variantsToCreate);

      await queryRunner.commitTransaction();

      return { id: savedProduct.id };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  // PUT /api/v1/admin/products/:id - Update product (TRANSACTION)
  async update(id: number, updateProductDto: UpdateProductDto) {
    const product = await this.productRepository.findOne({ where: { id: id as any } });

    if (!product) {
      throw new NotFoundException('Sản phẩm không tồn tại');
    }

    // Validate sizes and colors if provided
    if (updateProductDto.selected_size_ids || updateProductDto.selected_color_ids) {
      await this.validateSizesAndColors(
        updateProductDto.selected_size_ids,
        updateProductDto.selected_color_ids,
      );
    }

    // Auto-generate SKUs if provided but not filled
    if (updateProductDto.variants) {
      const productName = updateProductDto.name || product.name;
      for (const variant of updateProductDto.variants) {
        if (!variant.sku) {
          variant.sku = await this.generateSKU(productName, variant.color_id, variant.size_id);
        }
      }

      const skus = updateProductDto.variants.map(v => v.sku);
      await this.validateSKUs(skus, id);
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // 1. Update product basic info
      if (updateProductDto.name) {
        product.name = updateProductDto.name;
        // Regenerate slug
        product.slug = await this.slugService.generateUniqueSlug(
          updateProductDto.name,
          async (slug: string, excludeId?: number) => {
            const exists = await this.productRepository
              .createQueryBuilder('product')
              .where('product.slug = :slug', { slug })
              .andWhere('product.id != :id', { id: excludeId })
              .getOne();
            return !!exists;
          },
          id,
        );
      }

      if (updateProductDto.description !== undefined)
        product.description = updateProductDto.description;
      if (updateProductDto.full_description !== undefined)
        product.full_description = updateProductDto.full_description;
      if (updateProductDto.cost_price !== undefined)
        product.cost_price = updateProductDto.cost_price;
      if (updateProductDto.selling_price !== undefined)
        product.selling_price = updateProductDto.selling_price;
      if (updateProductDto.category_id !== undefined)
        product.category_id = updateProductDto.category_id;
      if (updateProductDto.status !== undefined) product.status = updateProductDto.status;

      await queryRunner.manager.save(product);

      // 2. Handle variant status updates (A7 logic - inactive variants when size/color unchecked)
      if (updateProductDto.selected_size_ids || updateProductDto.selected_color_ids) {
        await queryRunner.manager
          .createQueryBuilder()
          .update(ProductVariant)
          .set({ status: 'inactive' })
          .where('product_id = :productId', { productId: id })
          .andWhere('(size_id NOT IN (:...sizeIds) OR color_id NOT IN (:...colorIds))', {
            sizeIds: updateProductDto.selected_size_ids || [],
            colorIds: updateProductDto.selected_color_ids || [],
          })
          .execute();
      }

      // 3. Update individual variants (A5 logic)
      if (updateProductDto.variants) {
        for (const variantDto of updateProductDto.variants) {
          if (variantDto.variant_id) {
            await queryRunner.manager.update(
              ProductVariant,
              { id: variantDto.variant_id as any },
              {
                sku: variantDto.sku,
                status: variantDto.status,
              },
            );
          }
        }
      }

      await queryRunner.commitTransaction();

      // Return updated product with product_count
      const productCount = await this.variantRepository.count({
        where: {
          product_id: product.id as any,
          status: 'active',
        },
      });

      return {
        id: product.id,
        name: product.name,
        slug: product.slug,
        selling_price: product.selling_price,
        status: product.status,
        variant_count: productCount,
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  // PATCH /api/v1/admin/products/:id/status - Soft delete
  async updateStatus(id: number, updateStatusDto: UpdateProductStatusDto) {
    const product = await this.productRepository.findOne({ where: { id: id as any } });

    if (!product) {
      throw new NotFoundException('Sản phẩm không tồn tại');
    }

    product.status = updateStatusDto.status;
    await this.productRepository.save(product);

    return {
      id: product.id,
      status: product.status,
    };
  }

  // Helper: Validate sizes and colors exist
  private async validateSizesAndColors(sizeIds?: number[], colorIds?: number[]) {
    if (sizeIds && sizeIds.length > 0) {
      const sizes = await this.sizeRepository.findBy({ id: In(sizeIds) as any });
      if (sizes.length !== sizeIds.length) {
        throw new BadRequestException('Một hoặc nhiều size không tồn tại');
      }
    }

    if (colorIds && colorIds.length > 0) {
      const colors = await this.colorRepository.findBy({ id: In(colorIds) as any });
      if (colors.length !== colorIds.length) {
        throw new BadRequestException('Một hoặc nhiều color không tồn tại');
      }
    }
  }

  // Helper: Validate SKUs are unique globally
  private async validateSKUs(skus: string[], excludeProductId?: number) {
    const queryBuilder = this.variantRepository
      .createQueryBuilder('variant')
      .where('variant.sku IN (:...skus)', { skus });

    if (excludeProductId) {
      queryBuilder.andWhere('variant.product_id != :productId', {
        productId: excludeProductId,
      });
    }

    const existingVariants = await queryBuilder.getMany();

    if (existingVariants.length > 0) {
      const duplicateSKUs = existingVariants.map(v => v.sku);
      throw new ConflictException(`SKU đã tồn tại: ${duplicateSKUs.join(', ')}`);
    }
  }

  // Helper: Auto-generate SKU from product name, color code, and size code
  // Format: PRODUCT_NAME-COLOR-SIZE (e.g., AO_KHOAC_BOMBER-WHT-M)
  private async generateSKU(productName: string, colorId: number, sizeId: number): Promise<string> {
    // Get color and size info
    const [color, size] = await Promise.all([
      this.colorRepository.findOne({ where: { id: colorId as any } }),
      this.sizeRepository.findOne({ where: { id: sizeId as any } }),
    ]);

    if (!color || !size) {
      throw new BadRequestException('Color hoặc Size không tồn tại');
    }

    // Normalize product name: remove special chars, uppercase, replace spaces with _
    const normalizedName = productName
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
      .toUpperCase()
      .replace(/[^A-Z0-9\s]/g, '') // Remove special chars
      .trim()
      .replace(/\s+/g, '_'); // Replace spaces with _

    // Get color code (first 3 chars uppercase from name)
    const colorCode = color.name.substring(0, 3).toUpperCase();

    // Get size code (name uppercase)
    const sizeCode = size.name.toUpperCase();

    // Generate base SKU
    const baseSku = `${normalizedName}-${colorCode}-${sizeCode}`;

    // Check if SKU exists, if yes, append counter
    let sku = baseSku;
    let counter = 1;

    while (await this.variantRepository.findOne({ where: { sku } })) {
      sku = `${baseSku}-${counter}`;
      counter++;
    }

    return sku;
  }

  // GET /api/v1/admin/products/low-stock - Products with low stock
  async getLowStockProducts(threshold: number = 10) {
    const lowStockVariants = await this.variantRepository
      .createQueryBuilder('variant')
      .leftJoinAndSelect('variant.product', 'product')
      .leftJoinAndSelect('variant.size', 'size')
      .leftJoinAndSelect('variant.color', 'color')
      .where('variant.total_stock <= :threshold', { threshold })
      .andWhere('product.status = :status', { status: 'active' })
      .orderBy('variant.total_stock', 'ASC')
      .getMany();

    // Group by product
    const productsMap = new Map();

    for (const variant of lowStockVariants) {
      if (!variant.product) continue;

      const productId = variant.product.id;

      if (!productsMap.has(productId)) {
        productsMap.set(productId, {
          product_id: variant.product.id,
          product_name: variant.product.name,
          thumbnail_url: variant.product.thumbnail_url || null,
          low_stock_variants: [],
        });
      }

      productsMap.get(productId).low_stock_variants.push({
        variant_id: variant.id,
        sku: variant.sku,
        size: variant.size?.name || 'N/A',
        color: variant.color?.name || 'N/A',
        current_stock: variant.total_stock,
        reorder_point: threshold,
      });
    }

    return {
      threshold,
      total_products: productsMap.size,
      total_variants: lowStockVariants.length,
      products: Array.from(productsMap.values()),
    };
  }

  // ==================== ANALYTICS ====================

  // GET /api/v1/admin/products/:id/analytics - Overview analytics
  async getProductAnalytics(productId: number) {
    // Get all variant IDs for this product
    const variants = await this.variantRepository.find({
      where: { product_id: productId as any },
      select: ['id', 'total_stock', 'reserved_stock', 'reorder_point'],
    });

    const variantIds = variants.map(v => v.id);

    // Sales data from order_items
    let salesResult = null;
    if (variantIds.length > 0) {
      salesResult = await this.orderItemRepository
        .createQueryBuilder('oi')
        .select('SUM(oi.quantity * oi.price_at_purchase)', 'total_revenue')
        .addSelect('SUM(oi.quantity)', 'total_units_sold')
        .addSelect('COUNT(DISTINCT oi.order_id)', 'total_orders')
        .addSelect('AVG(oi.price_at_purchase)', 'average_order_value')
        .innerJoin('oi.order', 'o')
        .where('oi.variant_id IN (:...variantIds)', { variantIds })
        .andWhere('o.fulfillment_status = :status', { status: 'delivered' })
        .getRawOne();
    }

    // Inventory data
    const inventory = {
      total_stock: variants.reduce((sum, v) => sum + (v.total_stock || 0), 0),
      available_stock: variants.reduce(
        (sum, v) => sum + ((v.total_stock || 0) - (v.reserved_stock || 0)),
        0,
      ),
      reserved_stock: variants.reduce((sum, v) => sum + (v.reserved_stock || 0), 0),
      variants_count: variants.length,
      low_stock_variants: variants.filter(v => v.total_stock <= v.reorder_point).length,
      out_of_stock_variants: variants.filter(v => v.total_stock === 0).length,
    };

    // Ratings data from reviews
    let ratingsResult = null;
    if (variantIds.length > 0) {
      ratingsResult = await this.reviewRepository
        .createQueryBuilder('r')
        .select('AVG(r.rating)', 'average_rating')
        .addSelect('COUNT(*)', 'total_reviews')
        .addSelect('COUNT(CASE WHEN r.rating = 5 THEN 1 END)', 'rating_5')
        .addSelect('COUNT(CASE WHEN r.rating = 4 THEN 1 END)', 'rating_4')
        .addSelect('COUNT(CASE WHEN r.rating = 3 THEN 1 END)', 'rating_3')
        .addSelect('COUNT(CASE WHEN r.rating = 2 THEN 1 END)', 'rating_2')
        .addSelect('COUNT(CASE WHEN r.rating = 1 THEN 1 END)', 'rating_1')
        .where('r.variant_id IN (:...variantIds)', { variantIds })
        .andWhere('r.status = :status', { status: 'approved' })
        .getRawOne();
    }

    const totalReviews = parseInt(ratingsResult?.total_reviews || '0');
    const ratingDistribution =
      totalReviews > 0
        ? {
            5: {
              count: parseInt(ratingsResult.rating_5 || '0'),
              percentage: Math.round(
                (parseInt(ratingsResult.rating_5 || '0') / totalReviews) * 100,
              ),
            },
            4: {
              count: parseInt(ratingsResult.rating_4 || '0'),
              percentage: Math.round(
                (parseInt(ratingsResult.rating_4 || '0') / totalReviews) * 100,
              ),
            },
            3: {
              count: parseInt(ratingsResult.rating_3 || '0'),
              percentage: Math.round(
                (parseInt(ratingsResult.rating_3 || '0') / totalReviews) * 100,
              ),
            },
            2: {
              count: parseInt(ratingsResult.rating_2 || '0'),
              percentage: Math.round(
                (parseInt(ratingsResult.rating_2 || '0') / totalReviews) * 100,
              ),
            },
            1: {
              count: parseInt(ratingsResult.rating_1 || '0'),
              percentage: Math.round(
                (parseInt(ratingsResult.rating_1 || '0') / totalReviews) * 100,
              ),
            },
          }
        : null;

    return {
      sales: {
        total_revenue: parseFloat(salesResult?.total_revenue || '0'),
        total_units_sold: parseInt(salesResult?.total_units_sold || '0'),
        total_orders: parseInt(salesResult?.total_orders || '0'),
        average_order_value: parseFloat(salesResult?.average_order_value || '0'),
      },
      inventory,
      ratings: {
        average_rating: parseFloat(ratingsResult?.average_rating || '0'),
        total_reviews: totalReviews,
        rating_distribution: ratingDistribution,
      },
    };
  }

  // GET /api/v1/admin/products/:id/analytics/sales - Sales trend
  async getProductSalesTrend(productId: number, period: string = '30days') {
    const variants = await this.variantRepository.find({
      where: { product_id: productId as any },
      select: ['id'],
    });

    const variantIds = variants.map(v => v.id);
    if (variantIds.length === 0) {
      return { period, data: [], total_revenue: 0, total_units_sold: 0 };
    }

    const days =
      period === '7days' ? 7 : period === '30days' ? 30 : period === '3months' ? 90 : 365;

    const salesData = await this.orderItemRepository
      .createQueryBuilder('oi')
      .select('DATE(o.created_at)', 'date')
      .addSelect('SUM(oi.quantity * oi.price_at_purchase)', 'revenue')
      .addSelect('SUM(oi.quantity)', 'units_sold')
      .addSelect('COUNT(DISTINCT oi.order_id)', 'orders')
      .innerJoin('oi.order', 'o')
      .where('oi.variant_id IN (:...variantIds)', { variantIds })
      .andWhere(`o.created_at >= CURRENT_DATE - INTERVAL '${days} days'`)
      .andWhere('o.fulfillment_status = :status', { status: 'delivered' })
      .groupBy('DATE(o.created_at)')
      .orderBy('date', 'ASC')
      .getRawMany();

    const formattedData = salesData.map(d => ({
      date: d.date,
      revenue: parseFloat(d.revenue || 0),
      units_sold: parseInt(d.units_sold || 0),
      orders: parseInt(d.orders || 0),
    }));

    const totalRevenue = formattedData.reduce((sum, d) => sum + d.revenue, 0);
    const totalUnitsSold = formattedData.reduce((sum, d) => sum + d.units_sold, 0);

    return {
      period,
      data: formattedData,
      total_revenue: totalRevenue,
      total_units_sold: totalUnitsSold,
    };
  }

  // GET /api/v1/admin/products/:id/analytics/variants - Variants sales analytics
  async getVariantsAnalytics(productId: number) {
    const variantsData = await this.variantRepository
      .createQueryBuilder('pv')
      .select('pv.id', 'variant_id')
      .addSelect('pv.sku', 'sku')
      .addSelect('s.name', 'size')
      .addSelect('c.name', 'color')
      .addSelect('pv.total_stock', 'current_stock')
      .addSelect('COALESCE(SUM(oi.quantity), 0)', 'total_sold')
      .addSelect('COALESCE(SUM(oi.quantity * oi.price_at_purchase), 0)', 'revenue')
      .leftJoin('pv.size', 's')
      .leftJoin('pv.color', 'c')
      .leftJoin('pv.order_items', 'oi')
      .leftJoin('oi.order', 'o', 'o.fulfillment_status = :status', { status: 'delivered' })
      .where('pv.product_id = :productId', { productId })
      .groupBy('pv.id, pv.sku, s.name, c.name, pv.total_stock')
      .getRawMany();

    const totalSold = variantsData.reduce((sum, v) => sum + parseInt(v.total_sold || 0), 0);

    const variants = variantsData
      .map(v => ({
        variant_id: v.variant_id,
        sku: v.sku,
        size: v.size || 'N/A',
        color: v.color || 'N/A',
        total_sold: parseInt(v.total_sold || 0),
        revenue: parseFloat(v.revenue || 0),
        percentage: totalSold > 0 ? Math.round((parseInt(v.total_sold || 0) / totalSold) * 100) : 0,
        current_stock: v.current_stock,
      }))
      .sort((a, b) => b.total_sold - a.total_sold);

    return {
      variants,
      total_sold: totalSold,
    };
  }

  // GET /api/v1/admin/products/:id/reviews - Admin view of product reviews
  async getProductReviews(productId: number, query: any) {
    const page = parseInt(query.page) || 1;
    const limit = parseInt(query.limit) || 10;
    const skip = (page - 1) * limit;

    // Get variant IDs for this product
    const variants = await this.variantRepository.find({
      where: { product_id: productId as any },
      select: ['id'],
    });

    const variantIds = variants.map(v => v.id);
    if (variantIds.length === 0) {
      return {
        reviews: [],
        metadata: { page, limit, total: 0, total_pages: 0 },
        summary: { total_approved: 0, total_pending: 0, total_rejected: 0, average_rating: 0 },
      };
    }

    const queryBuilder = this.reviewRepository
      .createQueryBuilder('r')
      .leftJoinAndSelect('r.customer', 'customer')
      .leftJoinAndSelect('r.variant', 'variant')
      .leftJoinAndSelect('r.order', 'order')
      .where('r.variant_id IN (:...variantIds)', { variantIds });

    // Apply filters
    if (query.rating && query.rating !== 'all') {
      queryBuilder.andWhere('r.rating = :rating', { rating: parseInt(query.rating) });
    }

    if (query.status && query.status !== 'all') {
      queryBuilder.andWhere('r.status = :status', { status: query.status });
    }

    // Apply sorting
    const sortField = query.sort === 'rating' ? 'r.rating' : 'r.created_at';
    const sortOrder = query.order === 'asc' ? 'ASC' : 'DESC';
    queryBuilder.orderBy(sortField, sortOrder);

    // Get paginated results
    const [reviews, total] = await queryBuilder.skip(skip).take(limit).getManyAndCount();

    // Get summary stats
    const summaryResult = await this.reviewRepository
      .createQueryBuilder('r')
      .select('COUNT(CASE WHEN r.status = :approved THEN 1 END)', 'total_approved')
      .addSelect('COUNT(CASE WHEN r.status = :pending THEN 1 END)', 'total_pending')
      .addSelect('COUNT(CASE WHEN r.status = :rejected THEN 1 END)', 'total_rejected')
      .addSelect('AVG(r.rating)', 'average_rating')
      .where('r.variant_id IN (:...variantIds)', { variantIds })
      .setParameters({ approved: 'approved', pending: 'pending', rejected: 'rejected' })
      .getRawOne();

    return {
      reviews: reviews.map(r => ({
        id: r.id,
        customer_id: r.customer_id,
        customer_name: r.customer?.name || 'Unknown',
        customer_email: r.customer?.email || 'N/A',
        order_id: r.order_id,
        variant_id: r.variant_id,
        variant_sku: r.variant?.sku || 'N/A',
        rating: r.rating,
        comment: r.comment,
        status: r.status,
        created_at: r.created_at,
      })),
      metadata: {
        page,
        limit,
        total,
        total_pages: Math.ceil(total / limit),
      },
      summary: {
        total_approved: parseInt(summaryResult?.total_approved || '0'),
        total_pending: parseInt(summaryResult?.total_pending || '0'),
        total_rejected: parseInt(summaryResult?.total_rejected || '0'),
        average_rating: parseFloat(summaryResult?.average_rating || '0'),
      },
    };
  }
}
