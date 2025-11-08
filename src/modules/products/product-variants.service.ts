import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProductVariant } from '../../entities/product-variant.entity';
import { UpdateVariantDto } from './dto/update-variant.dto';

@Injectable()
export class ProductVariantsService {
  constructor(
    @InjectRepository(ProductVariant)
    private variantRepository: Repository<ProductVariant>,
  ) {}

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
}
