import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Category } from '../../entities/category.entity';
import { Product } from '../../entities/product.entity';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { SlugService } from '../../common/services/slug.service';

@Injectable()
export class CategoriesService {
  constructor(
    @InjectRepository(Category)
    private categoryRepository: Repository<Category>,
    @InjectRepository(Product)
    private productRepository: Repository<Product>,
    private slugService: SlugService,
  ) {}

  // API 1: Lấy thống kê categories
  async getStats() {
    const totalCategories = await this.categoryRepository.count();
    const activeCategories = await this.categoryRepository.count({
      where: { status: 'active' },
    });

    // Đếm tổng số products có status='active'
    const totalProducts = await this.productRepository.count({
      where: { status: 'active' },
    });

    return {
      total_categories: totalCategories,
      active_categories: activeCategories,
      total_products: totalProducts,
    };
  }

  // API 2: Lấy danh sách categories (admin)
  async findAllForAdmin() {
    const categories = await this.categoryRepository
      .createQueryBuilder('category')
      .leftJoin('category.products', 'product', 'product.status = :status', { status: 'active' })
      .select([
        'category.id',
        'category.name',
        'category.slug',
        'category.status',
      ])
      .addSelect('COUNT(product.id)', 'product_count')
      .groupBy('category.id')
      .orderBy('category.id', 'ASC')
      .getRawMany();

    return {
      data: categories.map(cat => ({
        id: cat.category_id,
        name: cat.category_name,
        slug: cat.category_slug,
        status: cat.category_status,
        product_count: parseInt(cat.product_count) || 0,
      })),
    };
  }

  // API 3: Tạo category mới
  async create(createCategoryDto: CreateCategoryDto) {
    // Kiểm tra tên category có trùng không
    const existingName = await this.categoryRepository.findOne({
      where: { name: createCategoryDto.name },
    });

    if (existingName) {
      throw new ConflictException('Tên category đã tồn tại');
    }

    // Generate slug unique
    const slug = await this.slugService.generateUniqueSlug(
      createCategoryDto.name,
      async (slug: string) => {
        const exists = await this.categoryRepository.findOne({ where: { slug } });
        return !!exists;
      },
    );

    // Tạo category mới
    const category = this.categoryRepository.create({
      name: createCategoryDto.name,
      slug: slug,
      status: createCategoryDto.status || 'active',
    });

    const savedCategory = await this.categoryRepository.save(category);

    return {
      id: savedCategory.id,
      name: savedCategory.name,
      slug: savedCategory.slug,
      status: savedCategory.status,
      product_count: 0,
    };
  }

  // API 4: Cập nhật category (name hoặc status)
  async update(id: number, updateCategoryDto: UpdateCategoryDto) {
    const category = await this.categoryRepository.findOne({ where: { id: id as any } });

    if (!category) {
      throw new NotFoundException('Category không tồn tại');
    }

    // Nếu update name
    if (updateCategoryDto.name) {
      // Kiểm tra tên mới có trùng không (trừ chính nó)
      const existingName = await this.categoryRepository.findOne({
        where: { name: updateCategoryDto.name },
      });

      if (existingName && Number(existingName.id) !== id) {
        throw new ConflictException('Tên category đã tồn tại');
      }

      // Generate slug mới
      const newSlug = await this.slugService.generateUniqueSlug(
        updateCategoryDto.name,
        async (slug: string, excludeId?: number) => {
          const exists = await this.categoryRepository
            .createQueryBuilder('category')
            .where('category.slug = :slug', { slug })
            .andWhere('category.id != :id', { id: excludeId })
            .getOne();
          return !!exists;
        },
        id,
      );

      category.name = updateCategoryDto.name;
      category.slug = newSlug;
    }

    // Nếu update status
    if (updateCategoryDto.status) {
      category.status = updateCategoryDto.status;
    }

    const updatedCategory = await this.categoryRepository.save(category);

    // Đếm products
    const productCount = await this.productRepository.count({
      where: {
        category_id: updatedCategory.id as any,
        status: 'active',
      },
    });

    return {
      id: updatedCategory.id,
      name: updatedCategory.name,
      slug: updatedCategory.slug,
      status: updatedCategory.status,
      product_count: productCount,
    };
  }

  // Helper: Public API - Lấy categories active (cho frontend)
  async findAllActive() {
    const categories = await this.categoryRepository.find({
      where: { status: 'active' },
      order: { name: 'ASC' },
    });

    return { categories };
  }

  // Helper: Public API - Lấy products by category slug
  async getProductsBySlug(slug: string, query: any) {
    const category = await this.categoryRepository.findOne({
      where: { slug, status: 'active' },
    });

    if (!category) {
      return { products: [], category: null };
    }

    const { page = 1, limit = 20 } = query;
    const skip = (page - 1) * limit;

    const [products, total] = await this.productRepository.findAndCount({
      where: {
        category_id: category.id as any,
        status: 'active',
      },
      relations: ['variants'],
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
