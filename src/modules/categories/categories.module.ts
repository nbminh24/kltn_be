import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CategoriesController } from './categories.controller';
import { AdminCategoriesController } from './admin-categories.controller';
import { CategoriesService } from './categories.service';
import { Category } from '../../entities/category.entity';
import { Product } from '../../entities/product.entity';
import { SlugService } from '../../common/services/slug.service';

@Module({
  imports: [TypeOrmModule.forFeature([Category, Product])],
  controllers: [CategoriesController, AdminCategoriesController],
  providers: [CategoriesService, SlugService],
  exports: [CategoriesService],
})
export class CategoriesModule {}
