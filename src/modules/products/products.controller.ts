import { Controller, Get, Post, Param, Query, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { ProductsService } from './products.service';
import { Public } from '../../common/decorators/public.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CreateReviewDto } from './dto/create-review.dto';

@ApiTags('Products')
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  @Public()
  @ApiOperation({ 
    summary: '[UC-C5] Danh sách sản phẩm',
    description: 'Lấy danh sách sản phẩm với filter theo danh mục, màu, size, giá, tìm kiếm, sắp xếp và phân trang. Hiển thị cả giá gốc và giá flash sale (nếu có).'
  })
  @ApiQuery({ name: 'page', required: false, example: 1, description: 'Trang hiện tại' })
  @ApiQuery({ name: 'limit', required: false, example: 20, description: 'Số sản phẩm mỗi trang' })
  @ApiQuery({ name: 'category_slug', required: false, example: 'ao-so-mi', description: 'Slug danh mục' })
  @ApiQuery({ name: 'colors', required: false, example: '1,2', description: 'Lọc theo màu (color_id), có thể nhiều' })
  @ApiQuery({ name: 'sizes', required: false, example: '1,2', description: 'Lọc theo size (size_id), có thể nhiều' })
  @ApiQuery({ name: 'min_price', required: false, example: 100000, description: 'Giá tối thiểu' })
  @ApiQuery({ name: 'max_price', required: false, example: 500000, description: 'Giá tối đa' })
  @ApiQuery({ name: 'search', required: false, example: 'Áo sơ mi', description: 'Tìm kiếm theo tên hoặc mô tả' })
  @ApiQuery({ name: 'sort_by', required: false, example: 'newest', description: 'Sắp xếp: newest | price_asc | price_desc | rating' })
  @ApiResponse({ status: 200, description: 'Danh sách sản phẩm với metadata phân trang' })
  findAll(@Query() query: any) {
    return this.productsService.findAll(query);
  }

  @Get('new-arrivals')
  @Public()
  @ApiOperation({ 
    summary: '[UC-C6] Sản phẩm mới (New Arrivals)',
    description: 'Lấy sản phẩm mới trong vòng 30 ngày qua, sắp xếp theo mới nhất.'
  })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 12 })
  @ApiResponse({ status: 200, description: 'Danh sách sản phẩm mới' })
  newArrivals(@Query() query: any) {
    return this.productsService.findAll({ 
      ...query,
      is_new_arrival: true, 
      sort_by: 'newest',
      limit: query.limit || 12,
    });
  }

  @Get('on-sale')
  @Public()
  @ApiOperation({ 
    summary: '[UC-C7] Sản phẩm khuyến mãi (Flash Sale)',
    description: 'Lấy sản phẩm đang có chương trình flash sale (promotion active), sắp xếp theo discount giảm dần.'
  })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 12 })
  @ApiResponse({ status: 200, description: 'Danh sách sản phẩm khuyến mãi' })
  onSale(@Query() query: any) {
    return this.productsService.findAll({ 
      ...query,
      is_on_sale: true,
      limit: query.limit || 12,
    });
  }

  @Get(':slug')
  @Public()
  @ApiOperation({ 
    summary: '[UC-C8] Chi tiết sản phẩm',
    description: 'Lấy thông tin chi tiết sản phẩm bao gồm: thông tin cơ bản, variants (size + color + stock), available_options (màu/size còn hàng), promotion, và sản phẩm liên quan.'
  })
  @ApiResponse({ status: 200, description: 'Chi tiết sản phẩm đầy đủ' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy sản phẩm' })
  findOne(@Param('slug') slug: string) {
    return this.productsService.findOne(slug);
  }

  // Review API will be implemented separately in reviews module
}
