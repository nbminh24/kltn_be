import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Product } from '../../entities/product.entity';
import { ProductVariant } from '../../entities/product-variant.entity';
import { Promotion } from '../../entities/promotion.entity';
import { StylingAdviceDto } from './dto/styling-advice.dto';
import { SizingAdviceDto } from './dto/sizing-advice.dto';
import { CompareProductsDto } from './dto/compare-products.dto';

@Injectable()
export class ConsultantService {
  constructor(
    @InjectRepository(Product)
    private productRepository: Repository<Product>,
    @InjectRepository(ProductVariant)
    private variantRepository: Repository<ProductVariant>,
    @InjectRepository(Promotion)
    private promotionRepository: Repository<Promotion>,
  ) {}

  // 1. API Tư vấn phối đồ
  async getStylingAdvice(dto: StylingAdviceDto) {
    const { occasion, style, gender, weather } = dto;

    // Mapping occasion -> categories
    const occasionCategoryMap = {
      wedding: ['Vest', 'Áo sơ mi', 'Giày da', 'Quần tây'],
      work: ['Áo sơ mi', 'Quần tây', 'Giày da', 'Blazer'],
      casual: ['Áo thun', 'Quần jean', 'Giày sneaker'],
      party: ['Áo sơ mi', 'Quần tây', 'Giày da'],
      sport: ['Áo thể thao', 'Quần short', 'Giày chạy bộ'],
    };

    const suggestedCategories = occasionCategoryMap[occasion.toLowerCase()] || [];

    if (suggestedCategories.length === 0) {
      return {
        success: false,
        message: 'Chưa có dữ liệu tư vấn cho dịp này',
        products: [],
      };
    }

    // Query products theo categories và attributes
    const queryBuilder = this.productRepository
      .createQueryBuilder('product')
      .leftJoinAndSelect('product.category', 'category')
      .leftJoinAndSelect('product.variants', 'variants')
      .where('product.status = :status', { status: 'active' })
      .andWhere('product.deleted_at IS NULL')
      .andWhere('category.name IN (:...categories)', { categories: suggestedCategories });

    // Filter theo style trong attributes nếu có
    if (style) {
      queryBuilder.andWhere("product.attributes->>'style' ILIKE :style", { style: `%${style}%` });
    }

    // Filter theo weather nếu có
    if (weather) {
      queryBuilder.andWhere(
        "product.attributes->>'season' ILIKE :weather OR product.attributes->>'weather' ILIKE :weather",
        { weather: `%${weather}%` },
      );
    }

    const products = await queryBuilder.orderBy('product.average_rating', 'DESC').take(3).getMany();

    return {
      success: true,
      occasion,
      style,
      recommended_products: products.map(p => ({
        id: p.id,
        name: p.name,
        slug: p.slug,
        price: p.selling_price,
        thumbnail: p.thumbnail_url,
        category: p.category?.name,
        rating: p.average_rating,
        attributes: p.attributes,
      })),
      styling_tip: this.generateStylingTip(occasion, style),
    };
  }

  // 2. API Tư vấn kích cỡ
  async getSizingAdvice(dto: SizingAdviceDto) {
    const { height, weight, product_id, category_slug } = dto;

    // Calculate BMI
    const bmi = weight / (height / 100) ** 2;

    // Logic tính size dựa trên chiều cao và cân nặng
    let recommendedSize = 'M';
    let fitType = 'Regular';

    if (height < 160) {
      recommendedSize = weight < 55 ? 'XS' : 'S';
    } else if (height < 170) {
      recommendedSize = weight < 60 ? 'S' : weight < 70 ? 'M' : 'L';
    } else if (height < 180) {
      recommendedSize = weight < 65 ? 'M' : weight < 75 ? 'L' : 'XL';
    } else {
      recommendedSize = weight < 70 ? 'L' : weight < 80 ? 'XL' : 'XXL';
    }

    // Nếu có product_id, check sản phẩm cụ thể
    let product = null;
    let isAvailable = false;
    let variantInfo = null;

    if (product_id) {
      product = await this.productRepository.findOne({
        where: { id: product_id, deleted_at: null },
        relations: ['variants', 'variants.size'],
      });

      if (!product) {
        throw new NotFoundException('Không tìm thấy sản phẩm');
      }

      // Check form áo từ attributes
      const productFit = product.attributes?.['fit'] || 'Regular';
      fitType = productFit;

      // Adjust size nếu form Slim
      if (productFit === 'Slim' && bmi > 23) {
        const sizeOrder = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];
        const currentIndex = sizeOrder.indexOf(recommendedSize);
        if (currentIndex < sizeOrder.length - 1) {
          recommendedSize = sizeOrder[currentIndex + 1];
        }
      }

      // Check tồn kho size đó
      const variant = product.variants.find(
        v => v.size?.name === recommendedSize && v.status === 'active',
      );

      if (variant) {
        const availableStock = variant.total_stock - variant.reserved_stock;
        isAvailable = availableStock > 0;
        variantInfo = {
          size: variant.size?.name,
          available_stock: availableStock,
          price: product.selling_price,
        };
      }
    }

    return {
      recommended_size: recommendedSize,
      fit_type: fitType,
      advice: this.generateSizingAdvice(height, weight, recommendedSize, fitType),
      is_available: isAvailable,
      product: product
        ? {
            id: product.id,
            name: product.name,
            slug: product.slug,
          }
        : null,
      variant_info: variantInfo,
    };
  }

  // 3. API So sánh sản phẩm
  async compareProducts(dto: CompareProductsDto) {
    const { product_names } = dto;

    if (product_names.length < 2 || product_names.length > 3) {
      throw new BadRequestException('Cần so sánh từ 2-3 sản phẩm');
    }

    // Tìm sản phẩm theo tên hoặc ID
    const products = await this.productRepository
      .createQueryBuilder('product')
      .leftJoinAndSelect('product.category', 'category')
      .leftJoinAndSelect('product.variants', 'variants')
      .where('product.deleted_at IS NULL')
      .andWhere('product.status = :status', { status: 'active' })
      .andWhere(
        product_names.every(name => !isNaN(Number(name)))
          ? 'product.id IN (:...ids)'
          : 'product.name ILIKE ANY(ARRAY[:...names])',
        product_names.every(name => !isNaN(Number(name)))
          ? { ids: product_names.map(Number) }
          : { names: product_names.map(n => `%${n}%`) },
      )
      .getMany();

    if (products.length < 2) {
      throw new NotFoundException('Không tìm đủ sản phẩm để so sánh');
    }

    // Extract comparison data
    const comparison = products.map(p => ({
      id: p.id,
      name: p.name,
      price: p.selling_price,
      category: p.category?.name,
      rating: p.average_rating,
      total_reviews: p.total_reviews,
      attributes: p.attributes || {},
      material: p.attributes?.['material'] || 'N/A',
      origin: p.attributes?.['origin'] || 'N/A',
      style: p.attributes?.['style'] || 'N/A',
      thumbnail: p.thumbnail_url,
    }));

    // Generate comparison summary
    const summary = this.generateComparisonSummary(comparison);

    return {
      products: comparison,
      summary,
    };
  }

  // Helper: Generate styling tip
  private generateStylingTip(occasion: string, style: string): string {
    const tips = {
      wedding:
        'Nên chọn vest hoặc áo sơ mi lịch sự, phối với quần tây và giày da. Tránh màu sắc quá chói.',
      work: 'Áo sơ mi trắng/xanh nhạt + quần tây xám/đen là combo an toàn cho môi trường công sở.',
      casual: 'Áo thun basic + quần jean + sneaker là bộ đồ thoải mái cho ngày thường.',
      party: 'Có thể chọn áo sơ mi họa tiết nhẹ nhàng hoặc áo polo, kết hợp quần tây slim fit.',
      sport: 'Nên chọn chất liệu thấm hút mồ hôi tốt, co giãn 4 chiều để dễ vận động.',
    };

    return (
      tips[occasion.toLowerCase()] || 'Hãy chọn trang phục phù hợp với dịp và phong cách của bạn.'
    );
  }

  // Helper: Generate sizing advice
  private generateSizingAdvice(height: number, weight: number, size: string, fit: string): string {
    return `Với chiều cao ${height}cm và cân nặng ${weight}kg, bạn nên mặc size ${size}. ${
      fit === 'Slim'
        ? 'Sản phẩm này form Slim fit nên ôm body, nếu thích rộng hơn thì tăng 1 size.'
        : 'Sản phẩm này form Regular nên khá thoải mái.'
    }`;
  }

  // Helper: Generate comparison summary
  private generateComparisonSummary(products: any[]): string {
    if (products.length === 0) return '';

    const priceDiff = Math.abs(products[0].price - products[1].price);
    const ratingDiff = Math.abs(products[0].rating - products[1].rating);

    let summary = `So sánh ${products.length} sản phẩm:\n`;
    summary += `- Chênh lệch giá: ${priceDiff.toLocaleString()}đ\n`;
    summary += `- Chênh lệch đánh giá: ${ratingDiff.toFixed(1)} sao\n`;

    // Find best value
    const bestValueIndex = products.reduce((bestIdx, curr, idx) => {
      const value = (curr.rating / curr.price) * 100000;
      const bestValue = (products[bestIdx].rating / products[bestIdx].price) * 100000;
      return value > bestValue ? idx : bestIdx;
    }, 0);

    summary += `- Đáng giá nhất: ${products[bestValueIndex].name}`;

    return summary;
  }
}
