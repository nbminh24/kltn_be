import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { CategoriesService } from './categories.service';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('📂 Categories')
@Controller('categories')
@Public()
export class CategoriesController {
  constructor(private readonly categoriesService: CategoriesService) { }

  @Get()
  @ApiOperation({ summary: 'Danh sách categories (Public - chỉ active)' })
  findAll() {
    return this.categoriesService.findAllActive();
  }

  @Get(':slug/products')
  @ApiOperation({ summary: 'Sản phẩm theo category' })
  getProductsBySlug(@Param('slug') slug: string, @Query() query: any) {
    return this.categoriesService.getProductsBySlug(slug, query);
  }
}
