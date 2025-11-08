import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, MoreThan } from 'typeorm';
import { Promotion } from '../../entities/promotion.entity';

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
      .andWhere(
        '(promotion.expiry_date IS NULL OR promotion.expiry_date >= CURRENT_DATE)',
      )
      .andWhere(
        '(promotion.start_date IS NULL OR promotion.start_date <= CURRENT_DATE)',
      )
      .andWhere(
        '(promotion.usage_limit IS NULL OR promotion.usage_count < promotion.usage_limit)',
      )
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
}
