import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { ProductImage } from '../../entities/product-image.entity';
import { ProductVariant } from '../../entities/product-variant.entity';
import { StorageService } from '../../common/services/storage.service';

@Injectable()
export class ProductImagesService {
  constructor(
    @InjectRepository(ProductImage)
    private imageRepository: Repository<ProductImage>,
    @InjectRepository(ProductVariant)
    private variantRepository: Repository<ProductVariant>,
    private storageService: StorageService,
    private dataSource: DataSource,
  ) {}

  // POST /api/v1/admin/variants/:id/images - Upload images for a variant
  async uploadImages(variantId: number, files: Express.Multer.File[], isMain: boolean = false) {
    // Check variant exists
    const variant = await this.variantRepository.findOne({
      where: { id: variantId as any },
      relations: ['product'],
    });

    if (!variant) {
      throw new NotFoundException('Variant không tồn tại');
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const uploadedImages = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];

        // Upload to Supabase Storage
        const imageUrl = await this.storageService.uploadFile(
          file,
          `products/${variant.product_id}/variants/${variantId}`,
        );

        // If this is set as main, unset other main images for this variant
        if (isMain && i === 0) {
          await queryRunner.manager.update(
            ProductImage,
            { variant_id: variantId as any, is_main: true },
            { is_main: false },
          );
        }

        // Insert to DB
        const image = queryRunner.manager.create(ProductImage, {
          variant_id: variantId,
          image_url: imageUrl,
          is_main: isMain && i === 0,
        });

        const savedImage = await queryRunner.manager.save(image);
        uploadedImages.push({
          id: savedImage.id,
          image_url: savedImage.image_url,
          is_main: savedImage.is_main,
        });
      }

      await queryRunner.commitTransaction();

      // Note: Trigger fn_update_product_thumbnail sẽ tự động chạy
      return {
        message: 'Upload thành công',
        images: uploadedImages,
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  // DELETE /api/v1/admin/images/:id - Delete an image
  async deleteImage(imageId: number) {
    const image = await this.imageRepository.findOne({
      where: { id: imageId as any },
    });

    if (!image) {
      throw new NotFoundException('Image không tồn tại');
    }

    const imageUrl = image.image_url;

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Delete from DB
      await queryRunner.manager.delete(ProductImage, { id: imageId as any });

      // Delete from Supabase Storage
      await this.storageService.deleteFile(imageUrl);

      await queryRunner.commitTransaction();

      // Note: Trigger fn_update_product_thumbnail sẽ tự động chạy
      return {
        message: 'Xóa ảnh thành công',
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }
}
