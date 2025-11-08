import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product } from '../../entities/product.entity';
import { Review } from '../../entities/review.entity';
import { OrderItem } from '../../entities/order-item.entity';
import { Order } from '../../entities/order.entity';
import { IdGenerator } from '../../common/utils/id-generator';

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Product)
    private productRepository: Repository<Product>,
    @InjectRepository(Review)
    private reviewRepository: Repository<Review>,
    @InjectRepository(OrderItem)
    private orderItemRepository: Repository<OrderItem>,
    @InjectRepository(Order)
    private orderRepository: Repository<Order>,
  ) {}

  async findAll(query: any) {
    const { category, minPrice, maxPrice, sort = 'newest', search, page = 1, limit = 20 } = query;

    const queryBuilder = this.productRepository
      .createQueryBuilder('product')
      .leftJoinAndSelect('product.category', 'category')
      .leftJoinAndSelect('product.images', 'images')
      .where('product.status = :status', { status: 'Active' });

    if (category) {
      queryBuilder.andWhere('product.category_id = :category', { category });
    }

    if (minPrice || maxPrice) {
      if (minPrice && maxPrice) {
        queryBuilder.andWhere('product.price BETWEEN :minPrice AND :maxPrice', {
          minPrice,
          maxPrice,
        });
      } else if (minPrice) {
        queryBuilder.andWhere('product.price >= :minPrice', { minPrice });
      } else {
        queryBuilder.andWhere('product.price <= :maxPrice', { maxPrice });
      }
    }

    if (search) {
      queryBuilder.andWhere('(product.name LIKE :search OR product.description LIKE :search)', {
        search: `%${search}%`,
      });
    }

    // Filter on-sale products only
    if (query.hasDiscount === 'true' || query.hasDiscount === true) {
      queryBuilder
        .andWhere('product.original_price IS NOT NULL')
        .andWhere('product.original_price > product.price');
    }

    // Sorting
    switch (sort) {
      case 'price_asc':
        queryBuilder.orderBy('product.price', 'ASC');
        break;
      case 'price_desc':
        queryBuilder.orderBy('product.price', 'DESC');
        break;
      case 'rating':
        queryBuilder.orderBy('product.rating', 'DESC');
        break;
      case 'bestseller':
        queryBuilder.orderBy('product.sold_count', 'DESC');
        break;
      default:
        queryBuilder.orderBy('product.created_at', 'DESC');
    }

    const skip = (page - 1) * limit;
    queryBuilder.skip(skip).take(limit);

    const [products, total] = await queryBuilder.getManyAndCount();

    return {
      products,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string) {
    const product = await this.productRepository.findOne({
      where: { id: parseInt(id) as any },
      relations: ['category', 'images', 'variants', 'reviews', 'reviews.user'],
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    // Get related products (same category)
    const relatedProducts = await this.productRepository.find({
      where: {
        category_id: product.category_id,
        status: 'Active',
      },
      relations: ['images'],
      take: 4,
    });

    return {
      product,
      relatedProducts: relatedProducts.filter(p => p.id !== parseInt(id)),
    };
  }

  async createReview(productId: string, userId: string, reviewData: any) {
    // DEPRECATED: Reviews disabled temporarily
    throw new BadRequestException('Review feature is under maintenance');
  }
}
