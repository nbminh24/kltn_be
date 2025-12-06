import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProductVariant } from '../../entities/product-variant.entity';
import { Product } from '../../entities/product.entity';
import { UpdateVariantDto } from './dto/update-variant.dto';
import { UpdateVariantStockDto } from './dto/admin-update-variant-stock.dto';
import { CreateSingleVariantDto } from './dto/admin-create-single-variant.dto';

@Injectable()
export class ProductVariantsService {
  constructor(
    @InjectRepository(ProductVariant)
    private variantRepository: Repository<ProductVariant>,
    @InjectRepository(Product)
    private productRepository: Repository<Product>,
  ) { }

  // GET /api/v1/admin/products/:id/variants - Get all variants of a product
  async findByProduct(productId: number) {
    const variants = await this.variantRepository
      .createQueryBuilder('variant')
      .leftJoinAndSelect('variant.size', 'size')
      .leftJoinAndSelect('variant.color', 'color')
      .leftJoinAndSelect('variant.images', 'images')
      .where('variant.product_id = :productId', { productId })
      .orderBy('size.sort_order', 'ASC')
      .addOrderBy('color.name', 'ASC')
      .getMany();

    return {
      data: variants.map((variant) => ({
        id: variant.id,
        sku: variant.sku,
        size_name: variant.size?.name || null,
        color_name: variant.color?.name || null,
        color_hex: variant.color?.hex_code || null,
        total_stock: variant.total_stock,
        reserved_stock: variant.reserved_stock,
        status: variant.status,
        images: variant.images.map((img) => ({
          id: img.id,
          image_url: img.image_url,
          is_main: img.is_main,
        })),
      })),
    };
  }

  // PATCH /api/v1/admin/variants/:id - Update a single variant
  async update(variantId: number, updateVariantDto: UpdateVariantDto) {
    const variant = await this.variantRepository.findOne({
      where: { id: variantId as any },
    });

    if (!variant) {
      throw new NotFoundException('Variant không tồn tại');
    }

    // Check SKU uniqueness if updating
    if (updateVariantDto.sku && updateVariantDto.sku !== variant.sku) {
      const existingSKU = await this.variantRepository.findOne({
        where: { sku: updateVariantDto.sku },
      });

      if (existingSKU) {
        throw new ConflictException('SKU đã tồn tại');
      }

      variant.sku = updateVariantDto.sku;
    }

    if (updateVariantDto.status) {
      variant.status = updateVariantDto.status;
    }

    const updated = await this.variantRepository.save(variant);

    return {
      id: updated.id,
      sku: updated.sku,
      status: updated.status,
    };
  }

  // PUT /api/v1/admin/products/:productId/variants/:id - Update variant stock & status
  async updateVariantStock(
    productId: number,
    variantId: number,
    updateDto: UpdateVariantStockDto,
  ) {
    // Find variant with product validation
    const variant = await this.variantRepository.findOne({
      where: { id: variantId as any },
    });

    if (!variant) {
      throw new NotFoundException('Variant không tồn tại');
    }

    // Validate variant belongs to product (convert bigint to number for comparison)
    const variantProductId = typeof variant.product_id === 'string'
      ? parseInt(variant.product_id)
      : variant.product_id;

    if (variantProductId !== productId) {
      throw new BadRequestException(
        `Variant ${variantId} không thuộc về product ${productId}`,
      );
    }

    // Update total_stock if provided
    if (updateDto.total_stock !== undefined) {
      variant.total_stock = updateDto.total_stock;
    }

    // Update status if provided
    if (updateDto.status) {
      variant.status = updateDto.status;
    }

    const updated = await this.variantRepository.save(variant);

    return {
      message: 'Cập nhật variant thành công',
      variant: {
        id: updated.id,
        sku: updated.sku,
        total_stock: updated.total_stock,
        reserved_stock: updated.reserved_stock,
        status: updated.status,
      },
    };
  }

  // POST /api/v1/admin/products/:productId/variants - Create new variant
  async createVariant(productId: number, createDto: CreateSingleVariantDto) {
    // Validate product exists
    const product = await this.productRepository.findOne({
      where: { id: productId as any },
    });

    if (!product) {
      throw new NotFoundException('Sản phẩm không tồn tại');
    }

    // Generate SKU if not provided
    const sku = createDto.sku || `PRODUCT-${productId}-SIZE-${createDto.size_id}-COLOR-${createDto.color_id}`;

    // Check SKU uniqueness
    const existingSKU = await this.variantRepository.findOne({
      where: { sku },
    });

    if (existingSKU) {
      throw new ConflictException(`SKU "${sku}" đã tồn tại`);
    }

    // Create variant
    const variant = this.variantRepository.create({
      product_id: productId,
      size_id: createDto.size_id,
      color_id: createDto.color_id,
      sku,
      total_stock: createDto.total_stock,
      reserved_stock: 0,
      reorder_point: 10,
      status: createDto.status || 'active',
    });

    const saved = await this.variantRepository.save(variant);

    return {
      message: 'Tạo variant thành công',
      variant: {
        id: saved.id,
        sku: saved.sku,
        size_id: saved.size_id,
        color_id: saved.color_id,
        total_stock: saved.total_stock,
        status: saved.status,
      },
    };
  }
}
