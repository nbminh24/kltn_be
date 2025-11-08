import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Category } from '../../entities/category.entity';
import { Product } from '../../entities/product.entity';

@Injectable()
export class CategoriesService {
  constructor(
    @InjectRepository(Category)
    private categoryRepository: Repository<Category>,
    @InjectRepository(Product)
    private productRepository: Repository<Product>,
  ) {}

  async findAll() {
    const categories = await this.categoryRepository.find({
      where: { status: 'Active' },
      order: { name: 'ASC' },
    });

    return { categories };
  }

  async getProductsBySlug(slug: string, query: any) {
    const category = await this.categoryRepository.findOne({
      where: { slug },
    });

    if (!category) {
      return { products: [], category: null };
    }

    const { page = 1, limit = 20 } = query;
    const skip = (page - 1) * limit;

    const [products, total] = await this.productRepository.findAndCount({
      where: {
        category_id: category.id,
        status: 'Active',
      },
      relations: ['images'],
      skip,
      take: limit,
    });

    return {
      category,
      products,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
