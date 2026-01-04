import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Promotion } from '../../entities/promotion.entity';
import { ValidatePromotionDto } from './dto/validate-promotion.dto';

@Injectable()
export class PromotionsService {
  constructor(
    @InjectRepository(Promotion)
    private promotionRepository: Repository<Promotion>,
  ) {}

  async getActivePromotions(query: any = {}) {
    const queryBuilder = this.promotionRepository
      .createQueryBuilder('promotion')
      .where('promotion.status = :status', { status: 'Active' })
      .andWhere('(promotion.expiry_date IS NULL OR promotion.expiry_date >= CURRENT_DATE)')
      .andWhere('(promotion.start_date IS NULL OR promotion.start_date <= CURRENT_DATE)')
      .andWhere('(promotion.usage_limit IS NULL OR promotion.usage_count < promotion.usage_limit)')
      .orderBy('promotion.discount_value', 'DESC');

    // Filter by type if specified
    if (query.type) {
      queryBuilder.andWhere('promotion.type = :type', { type: query.type });
    }

    const promotions = await queryBuilder.getMany();

    return {
      promotions,
      count: promotions.length,
    };
  }

  async validatePromotions(dto: ValidatePromotionDto) {
    const { codes, cart_total } = dto;

    if (!codes || codes.length === 0) {
      throw new BadRequestException('Danh sách mã giảm giá không được rỗng');
    }

    // Find promotions by codes (assuming promotion has a 'code' field, or use 'name')
    // Since DB schema doesn't show 'code' field, I'll search by name
    const promotions = await this.promotionRepository.find({
      where: { name: In(codes) },
    });

    if (promotions.length === 0) {
      return {
        valid: false,
        message: 'Không tìm thấy mã giảm giá hợp lệ',
        discount_amount: 0,
      };
    }

    const now = new Date();
    let totalDiscount = 0;
    const validPromotions = [];
    const invalidReasons = [];

    for (const promo of promotions) {
      // Check status
      if (promo.status !== 'active') {
        invalidReasons.push(`${promo.name}: Mã chưa kích hoạt (status: ${promo.status})`);
        continue;
      }

      // Check date range
      if (promo.start_date && new Date(promo.start_date) > now) {
        invalidReasons.push(`${promo.name}: Chưa đến thời gian sử dụng`);
        continue;
      }

      if (promo.end_date && new Date(promo.end_date) < now) {
        invalidReasons.push(`${promo.name}: Đã hết hạn sử dụng`);
        continue;
      }

      // Check usage limit
      if (promo.number_limited !== null && promo.number_limited <= 0) {
        invalidReasons.push(`${promo.name}: Đã hết lượt sử dụng`);
        continue;
      }

      // Calculate discount
      let discount = 0;
      if (promo.discount_type === 'percentage') {
        discount = (cart_total * Number(promo.discount_value)) / 100;
      } else if (promo.discount_type === 'fixed') {
        discount = Number(promo.discount_value);
      }

      totalDiscount += discount;
      validPromotions.push({
        name: promo.name,
        type: promo.type,
        discount_type: promo.discount_type,
        discount_value: promo.discount_value,
        calculated_discount: discount,
      });
    }

    // Check if total discount exceeds cart total
    if (totalDiscount > cart_total) {
      totalDiscount = cart_total;
    }

    return {
      valid: validPromotions.length > 0,
      message: validPromotions.length > 0 ? 'Mã giảm giá hợp lệ' : 'Không có mã giảm giá hợp lệ',
      discount_amount: Math.round(totalDiscount),
      applied_promotions: validPromotions,
      invalid_reasons: invalidReasons.length > 0 ? invalidReasons : undefined,
    };
  }

  async validateMix(dto: any) {
    const { coupon_codes, cart_value } = dto;

    if (!coupon_codes || coupon_codes.length === 0) {
      throw new BadRequestException('Danh sách mã giảm giá không được rỗng');
    }

    // Find promotions by codes
    const promotions = await this.promotionRepository.find({
      where: { name: In(coupon_codes) },
    });

    if (promotions.length === 0) {
      return {
        can_mix: false,
        message: 'Không tìm thấy mã giảm giá hợp lệ',
        explanation: 'Các mã bạn nhập không tồn tại trong hệ thống.',
      };
    }

    const now = new Date();
    const validCodes = [];
    const invalidReasons = [];

    // Check từng mã
    for (const promo of promotions) {
      // Check status
      if (promo.status !== 'active') {
        invalidReasons.push(`${promo.name}: Mã chưa được kích hoạt`);
        continue;
      }

      // Check date
      if (promo.start_date && new Date(promo.start_date) > now) {
        invalidReasons.push(`${promo.name}: Chưa đến thời gian sử dụng`);
        continue;
      }

      if (promo.end_date && new Date(promo.end_date) < now) {
        invalidReasons.push(`${promo.name}: Đã hết hạn`);
        continue;
      }

      // Check usage limit
      if (promo.number_limited !== null && promo.number_limited <= 0) {
        invalidReasons.push(`${promo.name}: Đã hết lượt sử dụng`);
        continue;
      }

      validCodes.push(promo);
    }

    // Logic rule: Không cho dùng 2 mã cùng loại giảm giá
    // Ví dụ: Không cho dùng 2 mã "percentage" cùng lúc
    if (validCodes.length > 1) {
      const discountTypes = validCodes.map(p => p.discount_type);
      const hasMultiplePercentage = discountTypes.filter(t => t === 'percentage').length > 1;
      const hasMultipleFixed = discountTypes.filter(t => t === 'fixed').length > 1;

      if (hasMultiplePercentage) {
        return {
          can_mix: false,
          message: 'Không thể dùng nhiều mã giảm % cùng lúc',
          explanation:
            'Hệ thống chỉ cho phép áp dụng 1 mã giảm theo phần trăm. Bạn có thể kết hợp 1 mã giảm % với 1 mã giảm cố định.',
          valid_codes: validCodes.map(p => p.name),
          invalid_reasons: invalidReasons,
        };
      }

      if (hasMultipleFixed) {
        return {
          can_mix: false,
          message: 'Không thể dùng nhiều mã giảm cố định cùng lúc',
          explanation:
            'Hệ thống chỉ cho phép áp dụng 1 mã giảm giá cố định. Bạn có thể kết hợp 1 mã giảm % với 1 mã giảm cố định.',
          valid_codes: validCodes.map(p => p.name),
          invalid_reasons: invalidReasons,
        };
      }
    }

    // Calculate total discount nếu được phép gộp
    let totalDiscount = 0;
    for (const promo of validCodes) {
      if (promo.discount_type === 'percentage') {
        totalDiscount += (cart_value * Number(promo.discount_value)) / 100;
      } else if (promo.discount_type === 'fixed') {
        totalDiscount += Number(promo.discount_value);
      }
    }

    // Limit discount to cart value
    if (totalDiscount > cart_value) {
      totalDiscount = cart_value;
    }

    return {
      can_mix: validCodes.length > 1,
      message:
        validCodes.length > 1
          ? `Có thể dùng ${validCodes.length} mã cùng lúc`
          : 'Chỉ có 1 mã hợp lệ',
      explanation:
        validCodes.length > 1
          ? `Bạn có thể kết hợp ${validCodes.map(p => p.name).join(' và ')} để được giảm tổng cộng ${totalDiscount.toLocaleString()}đ.`
          : `Mã ${validCodes[0]?.name} hợp lệ, giảm ${totalDiscount.toLocaleString()}đ.`,
      valid_codes: validCodes.map(p => ({
        code: p.name,
        type: p.discount_type,
        value: p.discount_value,
      })),
      total_discount: Math.round(totalDiscount),
      invalid_reasons: invalidReasons.length > 0 ? invalidReasons : undefined,
    };
  }
}
