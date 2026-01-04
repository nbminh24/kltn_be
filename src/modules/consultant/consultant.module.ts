import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConsultantController } from './consultant.controller';
import { ConsultantService } from './consultant.service';
import { Product } from '../../entities/product.entity';
import { ProductVariant } from '../../entities/product-variant.entity';
import { Promotion } from '../../entities/promotion.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Product, ProductVariant, Promotion])],
  controllers: [ConsultantController],
  providers: [ConsultantService],
  exports: [ConsultantService],
})
export class ConsultantModule {}
