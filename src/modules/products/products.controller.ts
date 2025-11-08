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
    summary: 'Danh sách sản phẩm',
    description: 'Lấy danh sách sản phẩm với filter theo danh mục, tìm kiếm, sắp xếp và phân trang. Bao gồm thông tin sản phẩm, giá, ảnh, đánh giá.'
  })
  @ApiQuery({ name: 'page', required: false, example: 1, description: 'Trang hiện tại' })
  @ApiQuery({ name: 'limit', required: false, example: 20, description: 'Số sản phẩm mỗi trang' })
  @ApiQuery({ name: 'category', required: false, example: 'dien-thoai', description: 'Slug danh mục' })
  @ApiQuery({ name: 'search', required: false, example: 'iPhone', description: 'Tìm kiếm theo tên' })
  @ApiQuery({ name: 'sort', required: false, example: 'newest', description: 'Sắp xếp: newest, price-asc, price-desc' })
  @ApiResponse({ status: 200, description: 'Danh sách sản phẩm với metadata phân trang' })
  findAll(@Query() query: any) {
    return this.productsService.findAll(query);
  }

  @Get('new-arrivals')
  @Public()
  @ApiOperation({ 
    summary: 'Sản phẩm mới',
    description: 'Lấy 12 sản phẩm mới nhất dựa theo ngày tạo (created_at).'
  })
  @ApiResponse({ status: 200, description: 'Danh sách sản phẩm mới' })
  newArrivals() {
    return this.productsService.findAll({ sort: 'newest', limit: 12 });
  }

  @Get('on-sale')
  @Public()
  @ApiOperation({ 
    summary: 'Sản phẩm giảm giá',
    description: 'Lấy 12 sản phẩm đang giảm giá (có original_price khác price).'
  })
  @ApiResponse({ status: 200, description: 'Danh sách sản phẩm giảm giá' })
  onSale() {
    return this.productsService.findAll({ limit: 12 });
  }

  @Get(':id')
  @Public()
  @ApiOperation({ 
    summary: 'Chi tiết sản phẩm',
    description: 'Lấy thông tin chi tiết sản phẩm bao gồm: ảnh, biến thể (size, color, stock), đánh giá và sản phẩm liên quan.'
  })
  @ApiResponse({ status: 200, description: 'Chi tiết sản phẩm và sản phẩm liên quan' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy sản phẩm' })
  findOne(@Param('id') id: string) {
    return this.productsService.findOne(id);
  }

  @Post(':id/reviews')
  @ApiBearerAuth('JWT-auth')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ 
    summary: 'Đánh giá sản phẩm',
    description: 'Tạo đánh giá cho sản phẩm với điểm số (1-5 sao), tiêu đề và nội dung. Hệ thống tự động cập nhật rating trung bình của sản phẩm.'
  })
  @ApiResponse({ status: 201, description: 'Đánh giá thành công' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy sản phẩm' })
  createReview(@Param('id') id: string, @CurrentUser() user: any, @Body() body: CreateReviewDto) {
    return this.productsService.createReview(id, user.userId, body);
  }
}
