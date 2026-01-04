import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  Body,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery, ApiBearerAuth } from '@nestjs/swagger';
import { ProductsService } from './products.service';
import { Public } from '../../common/decorators/public.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('📦 Products')
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  @Public()
  @ApiOperation({
    summary: '[UC-C5] Danh sách sản phẩm',
    description:
      'Lấy danh sách sản phẩm với filter theo danh mục, màu, size, giá, tìm kiếm, sắp xếp và phân trang. Hiển thị cả giá gốc và giá flash sale (nếu có).',
  })
  @ApiQuery({ name: 'page', required: false, example: 1, description: 'Trang hiện tại' })
  @ApiQuery({ name: 'limit', required: false, example: 20, description: 'Số sản phẩm mỗi trang' })
  @ApiQuery({
    name: 'category_slug',
    required: false,
    example: 'ao-so-mi',
    description: 'Slug danh mục',
  })
  @ApiQuery({
    name: 'colors',
    required: false,
    example: '1,2 hoặc Đỏ,Xanh',
    description: 'Lọc theo màu (color_id hoặc tên màu), có thể nhiều',
  })
  @ApiQuery({
    name: 'sizes',
    required: false,
    example: '1,2 hoặc M,L,XL',
    description: 'Lọc theo size (size_id hoặc tên size), có thể nhiều',
  })
  @ApiQuery({ name: 'min_price', required: false, example: 100000, description: 'Giá tối thiểu' })
  @ApiQuery({ name: 'max_price', required: false, example: 500000, description: 'Giá tối đa' })
  @ApiQuery({
    name: 'search',
    required: false,
    example: 'Áo sơ mi',
    description: 'Tìm kiếm theo tên hoặc mô tả',
  })
  @ApiQuery({
    name: 'sort_by',
    required: false,
    example: 'newest',
    description: 'Sắp xếp: newest | price_asc | price_desc | rating',
  })
  @ApiQuery({
    name: 'min_rating',
    required: false,
    example: 4,
    description: 'Lọc theo rating tối thiểu (0-5)',
  })
  @ApiResponse({ status: 200, description: 'Danh sách sản phẩm với metadata phân trang' })
  findAll(@Query() query: any) {
    return this.productsService.findAll(query);
  }

  @Get('new-arrivals')
  @Public()
  @ApiOperation({
    summary: '[UC-C6] Sản phẩm mới (New Arrivals)',
    description: 'Lấy sản phẩm mới trong vòng 30 ngày qua, sắp xếp theo mới nhất.',
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
    description:
      'Lấy sản phẩm đang có chương trình flash sale (promotion active), sắp xếp theo discount giảm dần.',
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

  @Get('id/:id')
  @Public()
  @ApiOperation({
    summary: 'Chi tiết sản phẩm theo ID',
    description:
      'Lấy thông tin chi tiết sản phẩm theo ID bao gồm: thông tin cơ bản, variants (size + color + stock), available_options (màu/size còn hàng), promotion, và sản phẩm liên quan.',
  })
  @ApiResponse({ status: 200, description: 'Chi tiết sản phẩm đầy đủ' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy sản phẩm' })
  findById(@Param('id') id: string) {
    const productId = parseInt(id, 10);
    if (isNaN(productId)) {
      throw new BadRequestException('ID sản phẩm không hợp lệ');
    }
    return this.productsService.findById(productId);
  }

  @Get('attributes')
  @Public()
  @ApiOperation({
    summary: 'Lấy danh sách attributes keys',
    description: 'Lấy tất cả các keys trong JSONB attributes. Giúp FE render bộ lọc động.',
  })
  @ApiResponse({ status: 200, description: 'Danh sách attribute keys' })
  getAttributes() {
    return this.productsService.getAttributes();
  }

  @Post('id/:id/notify')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Đăng ký nhận thông báo sản phẩm',
    description:
      'Đăng ký nhận thông báo khi sản phẩm có hàng hoặc giá giảm. Dùng cho chatbot request_stock_notification.',
  })
  @ApiResponse({ status: 201, description: 'Đăng ký thành công' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy sản phẩm' })
  createNotification(@Param('id') id: string, @Body() dto: any, @CurrentUser() user: any) {
    const productId = parseInt(id, 10);
    if (isNaN(productId)) {
      throw new BadRequestException('ID sản phẩm không hợp lệ');
    }
    const customerId = user?.customerId ? parseInt(user.customerId) : null;
    return this.productsService.createNotification(productId, customerId, dto);
  }

  @Get('availability')
  @Public()
  @ApiOperation({
    summary: '[Chatbot] Kiểm tra tồn kho sản phẩm',
    description:
      'Kiểm tra tình trạng hàng theo tên, size, màu. Dùng cho intent: check_product_availability',
  })
  @ApiQuery({
    name: 'name',
    required: true,
    description: 'Tên sản phẩm (tìm gần đúng)',
    example: 'áo sơ mi trắng',
  })
  @ApiQuery({ name: 'size', required: false, description: 'Kích cỡ', example: 'L' })
  @ApiQuery({ name: 'color', required: false, description: 'Màu sắc', example: 'white' })
  @ApiResponse({ status: 200, description: 'Thông tin tồn kho' })
  checkAvailability(@Query() query: any) {
    return this.productsService.checkAvailability(query);
  }

  @Get('featured')
  @Public()
  @ApiOperation({
    summary: '[Homepage] Sản phẩm nổi bật',
    description: 'Lấy sản phẩm nổi bật cho homepage (rating cao, bán chạy).',
  })
  @ApiQuery({ name: 'limit', required: false, example: 10 })
  @ApiResponse({ status: 200, description: 'Danh sách sản phẩm nổi bật' })
  getFeatured(@Query('limit') limit?: number) {
    return this.productsService.getFeatured(limit || 10);
  }

  @Get('filters')
  @Public()
  @ApiOperation({
    summary: '[UI] Lấy filter options',
    description: 'Lấy sizes, colors, và price range cho bộ lọc sản phẩm.',
  })
  @ApiQuery({ name: 'category_id', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Filter options' })
  getFilters(@Query('category_id') categoryId?: number) {
    return this.productsService.getFilters(categoryId);
  }

  @Get(':productId/reviews')
  @Public()
  @ApiOperation({
    summary: '[Product Detail] Lấy reviews của sản phẩm',
    description: 'Lấy danh sách reviews đã approved của sản phẩm với phân trang.',
  })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 10 })
  @ApiQuery({
    name: 'sort',
    required: false,
    example: 'created_at',
    description: 'created_at | rating',
  })
  @ApiQuery({ name: 'order', required: false, example: 'desc', description: 'asc | desc' })
  @ApiResponse({ status: 200, description: 'Danh sách reviews' })
  getProductReviews(@Param('productId') productId: string, @Query() query: any) {
    return this.productsService.getProductReviews(parseInt(productId), query);
  }

  @Get(':productId/related')
  @Public()
  @ApiOperation({
    summary: '[Product Detail] Sản phẩm liên quan',
    description: 'Lấy sản phẩm liên quan cùng category.',
  })
  @ApiQuery({ name: 'limit', required: false, example: 8 })
  @ApiResponse({ status: 200, description: 'Sản phẩm liên quan' })
  getRelatedProducts(@Param('productId') productId: string, @Query('limit') limit?: number) {
    return this.productsService.getRelatedProducts(parseInt(productId), limit || 8);
  }

  @Get(':slug')
  @Public()
  @ApiOperation({
    summary: '[UC-C8] Chi tiết sản phẩm theo slug',
    description:
      'Lấy thông tin chi tiết sản phẩm theo slug bao gồm: thông tin cơ bản, variants (size + color + stock), available_options (màu/size còn hàng), promotion, và sản phẩm liên quan.',
  })
  @ApiResponse({ status: 200, description: 'Chi tiết sản phẩm đầy đủ' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy sản phẩm' })
  findOne(@Param('slug') slug: string) {
    return this.productsService.findOne(slug);
  }
}
