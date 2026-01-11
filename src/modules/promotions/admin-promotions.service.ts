import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, DataSource } from 'typeorm';
import { Promotion } from '../../entities/promotion.entity';
import { PromotionProduct } from '../../entities/promotion-product.entity';
import { Product } from '../../entities/product.entity';
import { CreatePromotionDto } from './dto/create-promotion.dto';
import { UpdatePromotionDto } from './dto/update-promotion.dto';

@Injectable()
export class AdminPromotionsService {
    constructor(
        @InjectRepository(Promotion)
        private promotionRepository: Repository<Promotion>,
        @InjectRepository(PromotionProduct)
        private promotionProductRepository: Repository<PromotionProduct>,
        @InjectRepository(Product)
        private productRepository: Repository<Product>,
        private dataSource: DataSource,
    ) { }

    private calculateStatus(startDate: Date, endDate: Date): string {
        const now = new Date();

        if (now < startDate) {
            return 'scheduled';
        } else if (now >= startDate && now <= endDate) {
            return 'active';
        } else {
            return 'expired';
        }
    }

    private async linkProductsToPromotion(
        queryRunner: any,
        promotionId: number,
        productIds: number[],
        discountValue: number,
        discountType: string,
    ) {
        // Get product prices to calculate flash_sale_price
        const products = await queryRunner.manager.findBy(Product, {
            id: productIds as any,
        });

        const promotionProducts = [];

        for (const product of products) {
            let flashSalePrice: number;

            if (discountType === 'percentage') {
                // Calculate percentage discount
                flashSalePrice = product.price - (product.price * discountValue / 100);
            } else {
                // Fixed amount discount
                flashSalePrice = product.price - discountValue;
            }

            // Ensure flash_sale_price is not negative
            if (flashSalePrice < 0) {
                flashSalePrice = 0;
            }

            const promotionProduct = queryRunner.manager.create(PromotionProduct, {
                promotion_id: promotionId,
                product_id: product.id,
                flash_sale_price: flashSalePrice,
            });

            promotionProducts.push(promotionProduct);
        }

        await queryRunner.manager.save(PromotionProduct, promotionProducts);
    }

    async findAll(query: any = {}) {
        const page = parseInt(query.page) || 1;
        const limit = parseInt(query.limit) || 10;
        const status = query.status;
        const search = query.search;

        const queryBuilder = this.promotionRepository.createQueryBuilder('promotion');

        // Filter by status
        if (status && ['active', 'expired', 'scheduled'].includes(status)) {
            queryBuilder.andWhere('promotion.status = :status', { status });
        }

        // Search by name
        if (search) {
            queryBuilder.andWhere('promotion.name ILIKE :search', { search: `%${search}%` });
        }

        // Order by created_at desc (newest first)
        queryBuilder.orderBy('promotion.id', 'DESC');

        // Pagination
        const total = await queryBuilder.getCount();
        const promotions = await queryBuilder
            .skip((page - 1) * limit)
            .take(limit)
            .getMany();

        // Get used_count for each promotion (placeholder - would need order_promotions table)
        const promotionsWithCount = promotions.map(promo => ({
            id: promo.id,
            name: promo.name,
            type: promo.type,
            discount_value: parseFloat(String(promo.discount_value)),
            discount_type: promo.discount_type,
            number_limited: promo.number_limited,
            start_date: promo.start_date,
            end_date: promo.end_date,
            status: promo.status,
            used_count: 0, // Placeholder
        }));

        return {
            promotions: promotionsWithCount,
            pagination: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
        };
    }

    async findOne(id: number) {
        const promotion = await this.promotionRepository.findOne({
            where: { id: id as any },
        });

        if (!promotion) {
            throw new NotFoundException('Promotion not found');
        }

        return {
            id: promotion.id,
            name: promotion.name,
            type: promotion.type,
            discount_value: parseFloat(String(promotion.discount_value)),
            discount_type: promotion.discount_type,
            number_limited: promotion.number_limited,
            start_date: promotion.start_date,
            end_date: promotion.end_date,
            status: promotion.status,
            used_count: 0, // Placeholder
        };
    }

    async create(createPromotionDto: CreatePromotionDto) {
        // Validate date range
        const startDate = new Date(createPromotionDto.start_date);
        const endDate = new Date(createPromotionDto.end_date);

        if (endDate < startDate) {
            throw new BadRequestException('end_date must be greater than or equal to start_date');
        }

        // Validate product_ids if provided
        if (createPromotionDto.product_ids && createPromotionDto.product_ids.length > 0) {
            const products = await this.productRepository.findBy({
                id: createPromotionDto.product_ids as any,
            });

            if (products.length !== createPromotionDto.product_ids.length) {
                throw new BadRequestException('One or more product IDs are invalid');
            }
        }

        // Use transaction to ensure data consistency
        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();

        try {
            // Auto-calculate status
            const status = this.calculateStatus(startDate, endDate);

            const promotion = this.promotionRepository.create({
                name: createPromotionDto.name,
                type: createPromotionDto.type,
                discount_value: createPromotionDto.discount_value,
                discount_type: createPromotionDto.discount_type,
                number_limited: createPromotionDto.number_limited || 0,
                start_date: startDate,
                end_date: endDate,
                status,
            });

            const saved = await queryRunner.manager.save(promotion);

            // Link products if provided
            if (createPromotionDto.product_ids && createPromotionDto.product_ids.length > 0) {
                await this.linkProductsToPromotion(
                    queryRunner,
                    saved.id,
                    createPromotionDto.product_ids,
                    createPromotionDto.discount_value,
                    createPromotionDto.discount_type,
                );
            }

            await queryRunner.commitTransaction();

            return {
                id: saved.id,
                name: saved.name,
                type: saved.type,
                discount_value: parseFloat(String(saved.discount_value)),
                discount_type: saved.discount_type,
                number_limited: saved.number_limited,
                start_date: saved.start_date,
                end_date: saved.end_date,
                status: saved.status,
                used_count: 0,
                product_count: createPromotionDto.product_ids?.length || 0,
            };
        } catch (error) {
            await queryRunner.rollbackTransaction();
            throw error;
        } finally {
            await queryRunner.release();
        }
    }

    async update(id: number, updatePromotionDto: UpdatePromotionDto) {
        const promotion = await this.promotionRepository.findOne({
            where: { id: id as any },
        });

        if (!promotion) {
            throw new NotFoundException('Promotion not found');
        }

        // Validate date range if both dates provided
        if (updatePromotionDto.start_date && updatePromotionDto.end_date) {
            const startDate = new Date(updatePromotionDto.start_date);
            const endDate = new Date(updatePromotionDto.end_date);

            if (endDate < startDate) {
                throw new BadRequestException('end_date must be greater than or equal to start_date');
            }
        }

        // Validate product_ids if provided
        if (updatePromotionDto.product_ids && updatePromotionDto.product_ids.length > 0) {
            const products = await this.productRepository.findBy({
                id: updatePromotionDto.product_ids as any,
            });

            if (products.length !== updatePromotionDto.product_ids.length) {
                throw new BadRequestException('One or more product IDs are invalid');
            }
        }

        const queryRunner = this.dataSource.createQueryRunner();
        await queryRunner.connect();
        await queryRunner.startTransaction();

        try {
            // Update fields
            if (updatePromotionDto.name) promotion.name = updatePromotionDto.name;
            if (updatePromotionDto.type) promotion.type = updatePromotionDto.type;
            if (updatePromotionDto.discount_value !== undefined) {
                promotion.discount_value = updatePromotionDto.discount_value;
            }
            if (updatePromotionDto.discount_type) {
                promotion.discount_type = updatePromotionDto.discount_type;
            }
            if (updatePromotionDto.number_limited !== undefined) {
                promotion.number_limited = updatePromotionDto.number_limited;
            }
            if (updatePromotionDto.start_date) {
                promotion.start_date = new Date(updatePromotionDto.start_date);
            }
            if (updatePromotionDto.end_date) {
                promotion.end_date = new Date(updatePromotionDto.end_date);
            }

            // Update status - allow manual override if provided, otherwise auto-calculate
            if (updatePromotionDto.status) {
                promotion.status = updatePromotionDto.status;
            } else {
                promotion.status = this.calculateStatus(promotion.start_date, promotion.end_date);
            }

            const updated = await queryRunner.manager.save(promotion);

            // Update product links if provided
            if (updatePromotionDto.product_ids !== undefined) {
                // Delete existing links
                await queryRunner.manager.delete(PromotionProduct, {
                    promotion_id: id,
                });

                // Create new links if product_ids provided
                if (updatePromotionDto.product_ids.length > 0) {
                    await this.linkProductsToPromotion(
                        queryRunner,
                        id,
                        updatePromotionDto.product_ids,
                        updated.discount_value,
                        updated.discount_type,
                    );
                }
            }

            await queryRunner.commitTransaction();

            return {
                id: updated.id,
                name: updated.name,
                type: updated.type,
                discount_value: parseFloat(String(updated.discount_value)),
                discount_type: updated.discount_type,
                number_limited: updated.number_limited,
                start_date: updated.start_date,
                end_date: updated.end_date,
                status: updated.status,
                used_count: 0,
                product_count: updatePromotionDto.product_ids?.length || 0,
            };
        } catch (error) {
            await queryRunner.rollbackTransaction();
            throw error;
        } finally {
            await queryRunner.release();
        }
    }

    async remove(id: number) {
        const promotion = await this.promotionRepository.findOne({
            where: { id: id as any },
        });

        if (!promotion) {
            throw new NotFoundException('Promotion not found');
        }

        await this.promotionRepository.remove(promotion);

        return {
            message: 'Promotion deleted successfully',
        };
    }
}
