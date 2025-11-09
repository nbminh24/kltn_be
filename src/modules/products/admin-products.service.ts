import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, In } from 'typeorm';
import { Product } from '../../entities/product.entity';
import { ProductVariant } from '../../entities/product-variant.entity';
import { Size } from '../../entities/size.entity';
import { Color } from '../../entities/color.entity';
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
    @InjectRepository(Size)
    private sizeRepository: Repository<Size>,
    @InjectRepository(Color)
    private colorRepository: Repository<Color>,
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
    this.queryBuilderService.applySearch(
      queryBuilder,
      query.search,
      'product',
      ['name', 'slug'],
    );

    // Apply sorting
    this.queryBuilderService.applySort(
      queryBuilder,
      query.sort,
      'product',
      ['name', 'selling_price', 'created_at'],
    );

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

    // Get selected size_ids and color_ids (derived from variants)
    const variants = await this.variantRepository.find({
      where: { product_id: product.id as any },
    });

    const selectedSizeIds = [...new Set(variants.map(v => v.size_id).filter(Boolean))];
    const selectedColorIds = [...new Set(variants.map(v => v.color_id).filter(Boolean))];

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
          status: v.status,
          total_stock: 0,
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
          variant.sku = await this.generateSKU(
            productName,
            variant.color_id,
            variant.size_id,
          );
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

      if (updateProductDto.description !== undefined) product.description = updateProductDto.description;
      if (updateProductDto.full_description !== undefined) product.full_description = updateProductDto.full_description;
      if (updateProductDto.cost_price !== undefined) product.cost_price = updateProductDto.cost_price;
      if (updateProductDto.selling_price !== undefined) product.selling_price = updateProductDto.selling_price;
      if (updateProductDto.category_id !== undefined) product.category_id = updateProductDto.category_id;
      if (updateProductDto.status !== undefined) product.status = updateProductDto.status;

      await queryRunner.manager.save(product);

      // 2. Handle variant status updates (A7 logic - inactive variants when size/color unchecked)
      if (updateProductDto.selected_size_ids || updateProductDto.selected_color_ids) {
        await queryRunner.manager
          .createQueryBuilder()
          .update(ProductVariant)
          .set({ status: 'inactive' })
          .where('product_id = :productId', { productId: id })
          .andWhere(
            '(size_id NOT IN (:...sizeIds) OR color_id NOT IN (:...colorIds))',
            {
              sizeIds: updateProductDto.selected_size_ids || [],
              colorIds: updateProductDto.selected_color_ids || [],
            },
          )
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
      throw new ConflictException(
        `SKU đã tồn tại: ${duplicateSKUs.join(', ')}`,
      );
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
    let baseSku = `${normalizedName}-${colorCode}-${sizeCode}`;
    
    // Check if SKU exists, if yes, append counter
    let sku = baseSku;
    let counter = 1;
    
    while (await this.variantRepository.findOne({ where: { sku } })) {
      sku = `${baseSku}-${counter}`;
      counter++;
    }

    return sku;
  }
}
