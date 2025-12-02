import { Injectable, NotFoundException, ForbiddenException, ConflictException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Review } from '../../entities/review.entity';
import { Order } from '../../entities/order.entity';
import { OrderItem } from '../../entities/order-item.entity';
import { ProductVariant } from '../../entities/product-variant.entity';
import { Product } from '../../entities/product.entity';
import { CreateReviewDto } from './dto/create-review.dto';
import { UpdateReviewStatusDto } from './dto/update-review-status.dto';

@Injectable()
export class ReviewsService {
  constructor(
    @InjectRepository(Review)
    private reviewRepository: Repository<Review>,
    @InjectRepository(Order)
    private orderRepository: Repository<Order>,
    @InjectRepository(OrderItem)
    private orderItemRepository: Repository<OrderItem>,
    @InjectRepository(ProductVariant)
    private variantRepository: Repository<ProductVariant>,
    @InjectRepository(Product)
    private productRepository: Repository<Product>,
  ) { }

  // Customer creates a review
  async createReview(customerId: number, createReviewDto: CreateReviewDto) {
    const { order_id, variant_id, rating, comment } = createReviewDto;

    // 1. Verify customer owns this order
    const order = await this.orderRepository.findOne({
      where: { id: order_id, customer_id: customerId },
    });

    if (!order) {
      throw new ForbiddenException('You do not have permission to review this order');
    }

    // 2. Verify order is delivered
    if (order.fulfillment_status !== 'delivered') {
      throw new BadRequestException('You can only review delivered orders');
    }

    // 3. Verify order contains this variant
    const orderItem = await this.orderItemRepository.findOne({
      where: { order_id, variant_id },
    });

    if (!orderItem) {
      throw new ForbiddenException('This product is not in your order');
    }

    // 4. Check if already reviewed
    const existingReview = await this.reviewRepository.findOne({
      where: { order_id, variant_id, customer_id: customerId },
    });

    if (existingReview) {
      throw new ConflictException('You have already reviewed this product');
    }

    // 5. Create review
    const review = this.reviewRepository.create({
      customer_id: customerId,
      variant_id,
      order_id,
      rating,
      comment,
      status: 'pending',
    });

    const savedReview = await this.reviewRepository.save(review);

    return {
      message: 'Review submitted successfully. It will be visible after admin approval.',
      review: savedReview,
    };
  }

  // Customer get reviewable items (products they can review)
  async getReviewableItems(customerId: number) {
    const items = await this.orderItemRepository
      .createQueryBuilder('oi')
      .innerJoin('oi.order', 'o')
      .innerJoin('oi.variant', 'v')
      .innerJoin('v.product', 'p')
      .leftJoin('product_reviews', 'pr', 'pr.order_id = o.id AND pr.variant_id = oi.variant_id')
      .select([
        'o.id as order_id',
        'oi.variant_id as variant_id',
        'p.name as product_name',
        'p.thumbnail_url as thumbnail_url',
        'v.name as variant_name',
      ])
      .where('o.customer_id = :customerId', { customerId })
      .andWhere('o.fulfillment_status = :status', { status: 'delivered' })
      .andWhere('pr.id IS NULL') // Not reviewed yet
      .getRawMany();

    return { data: items };
  }

  // Customer get their reviews
  async getMyReviews(customerId: number) {
    const reviews = await this.reviewRepository.find({
      where: { customer_id: customerId },
      relations: ['variant', 'variant.product', 'variant.size', 'variant.color'],
      order: { created_at: 'DESC' },
    });

    return {
      reviews: reviews.map(r => ({
        id: r.id,
        rating: r.rating,
        comment: r.comment,
        status: r.status,
        created_at: r.created_at,
        product: {
          id: r.variant.product.id,
          name: r.variant.product.name,
          thumbnail: r.variant.product.thumbnail_url,
        },
        variant: {
          size: r.variant.size?.name,
          color: r.variant.color?.name,
        },
      })),
    };
  }

  // Admin get all reviews
  async getAllReviews(query: any) {
    const { page = 1, limit = 20, product_id, rating, status } = query;
    const skip = (page - 1) * limit;

    const queryBuilder = this.reviewRepository
      .createQueryBuilder('r')
      .leftJoinAndSelect('r.customer', 'c')
      .leftJoinAndSelect('r.variant', 'v')
      .leftJoinAndSelect('v.product', 'p')
      .orderBy('r.created_at', 'DESC');

    // Filters
    if (product_id) {
      queryBuilder.andWhere('p.id = :product_id', { product_id: parseInt(product_id) });
    }

    if (rating) {
      queryBuilder.andWhere('r.rating = :rating', { rating: parseInt(rating) });
    }

    if (status) {
      queryBuilder.andWhere('r.status = :status', { status });
    }

    const [reviews, total] = await queryBuilder
      .skip(skip)
      .take(parseInt(limit))
      .getManyAndCount();

    return {
      data: reviews,
      metadata: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // Admin update review status (approve/reject)
  async updateReviewStatus(reviewId: number, updateStatusDto: UpdateReviewStatusDto) {
    const review = await this.reviewRepository.findOne({
      where: { id: reviewId },
      relations: ['variant', 'variant.product'],
    });

    if (!review) {
      throw new NotFoundException('Review not found');
    }

    // Update status
    review.status = updateStatusDto.status;
    await this.reviewRepository.save(review);

    // Update product rating if approved
    if (updateStatusDto.status === 'approved') {
      await this.updateProductRating(review.variant.product.id);
    }

    return {
      message: `Review ${updateStatusDto.status} successfully`,
      review,
    };
  }

  // Admin delete review
  async deleteReview(reviewId: number) {
    const review = await this.reviewRepository.findOne({
      where: { id: reviewId },
      relations: ['variant', 'variant.product'],
    });

    if (!review) {
      throw new NotFoundException('Review not found');
    }

    const productId = review.variant.product.id;

    await this.reviewRepository.delete(reviewId);

    // Update product rating after deletion
    await this.updateProductRating(productId);

    return { message: 'Review deleted successfully' };
  }

  // Helper: Update product average rating and total reviews
  private async updateProductRating(productId: number) {
    const stats = await this.reviewRepository
      .createQueryBuilder('r')
      .innerJoin('r.variant', 'v')
      .select('AVG(r.rating)', 'avg')
      .addSelect('COUNT(*)', 'count')
      .where('v.product_id = :productId', { productId })
      .andWhere('r.status = :status', { status: 'approved' })
      .getRawOne();

    await this.productRepository.update(productId, {
      average_rating: parseFloat(stats.avg) || 0,
      total_reviews: parseInt(stats.count) || 0,
    });
  }
}
