import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AdminProductsService } from './admin-products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { UpdateProductStatusDto } from './dto/update-product-status.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@ApiTags('Admin - Products')
@Controller('api/v1/admin/products')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class AdminProductsController {
  constructor(private readonly adminProductsService: AdminProductsService) {}

  @Get()
  @ApiOperation({
    summary: 'Lấy danh sách sản phẩm (Admin)',
    description: 'Hỗ trợ pagination, filter, sort, search',
  })
  @ApiResponse({ status: 200, description: 'Danh sách sản phẩm' })
  findAll(@Query() query: any) {
    return this.adminProductsService.findAll(query);
  }

  @Get('low-stock')
  @ApiOperation({
    summary: 'Lấy danh sách sản phẩm tồn kho thấp',
    description: 'Lấy các sản phẩm có variants với số lượng tồn kho <= threshold (default: 10)',
  })
  @ApiResponse({
    status: 200,
    description: 'Danh sách sản phẩm low stock',
    schema: {
      example: {
        threshold: 10,
        total_products: 5,
        total_variants: 12,
        products: [
          {
            product_id: 1,
            product_name: 'T-Shirt Premium',
            product_sku: 'TSH-001',
            thumbnail_url: 'https://...',
            low_stock_variants: [
              {
                variant_id: 15,
                sku: 'TSH-001-BLU-M',
                size: 'M',
                color: 'Blue',
                current_stock: 5,
                reorder_point: 10,
              },
            ],
          },
        ],
      },
    },
  })
  getLowStockProducts(@Query('threshold') threshold?: string) {
    const parsedThreshold = threshold ? parseInt(threshold, 10) : 10;
    return this.adminProductsService.getLowStockProducts(parsedThreshold);
  }

  // ==================== ANALYTICS ENDPOINTS (Must be before :id route) ====================

  @Get(':id/analytics')
  @ApiOperation({
    summary: 'Lấy analytics tổng quan của sản phẩm',
    description: 'Sales data, inventory stats, và rating distribution',
  })
  @ApiResponse({ status: 200, description: 'Analytics overview' })
  @ApiResponse({ status: 404, description: 'Sản phẩm không tồn tại' })
  getProductAnalytics(@Param('id') id: string) {
    return this.adminProductsService.getProductAnalytics(parseInt(id));
  }

  @Get(':id/analytics/sales')
  @ApiOperation({
    summary: 'Lấy sales trend của sản phẩm',
    description: 'Daily sales data theo period',
  })
  @ApiResponse({ status: 200, description: 'Sales trend data' })
  async getProductSalesTrend(@Param('id') id: string, @Query('period') period?: string) {
    try {
      return await this.adminProductsService.getProductSalesTrend(parseInt(id), period);
    } catch (error) {
      console.error('Error in getProductSalesTrend:', error);
      throw error;
    }
  }

  @Get(':id/analytics/variants')
  @ApiOperation({
    summary: 'Lấy variants sales analytics',
    description: 'Top selling variants với revenue và percentage',
  })
  @ApiResponse({ status: 200, description: 'Variants analytics' })
  async getVariantsAnalytics(@Param('id') id: string) {
    try {
      return await this.adminProductsService.getVariantsAnalytics(parseInt(id));
    } catch (error) {
      console.error('Error in getVariantsAnalytics:', error);
      throw error;
    }
  }

  @Get(':id/reviews')
  @ApiOperation({
    summary: 'Lấy reviews của sản phẩm (Admin view)',
    description: 'Paginated reviews với filters và summary stats',
  })
  @ApiResponse({ status: 200, description: 'Product reviews' })
  getProductReviews(@Param('id') id: string, @Query() query: any) {
    return this.adminProductsService.getProductReviews(parseInt(id), query);
  }

  // ==================== END ANALYTICS ====================

  @Get(':id')
  @ApiOperation({
    summary: 'Lấy chi tiết sản phẩm',
    description: 'Lấy thông tin sản phẩm và derived selected_size_ids/color_ids',
  })
  @ApiResponse({ status: 200, description: 'Chi tiết sản phẩm' })
  @ApiResponse({ status: 404, description: 'Sản phẩm không tồn tại' })
  findOne(@Param('id') id: string) {
    return this.adminProductsService.findOne(parseInt(id));
  }

  @Post()
  @ApiOperation({
    summary: 'Tạo sản phẩm mới',
    description: 'Tạo sản phẩm và tất cả variants trong 1 transaction',
  })
  @ApiResponse({ status: 201, description: 'Tạo thành công', schema: { example: { id: 1 } } })
  @ApiResponse({ status: 400, description: 'Dữ liệu không hợp lệ' })
  @ApiResponse({ status: 409, description: 'SKU đã tồn tại' })
  create(@Body() createProductDto: CreateProductDto) {
    return this.adminProductsService.create(createProductDto);
  }

  @Put(':id')
  @ApiOperation({
    summary: 'Cập nhật sản phẩm',
    description: 'Cập nhật sản phẩm và xử lý logic vô hiệu hóa variants',
  })
  @ApiResponse({ status: 200, description: 'Cập nhật thành công' })
  @ApiResponse({ status: 404, description: 'Sản phẩm không tồn tại' })
  @ApiResponse({ status: 409, description: 'SKU đã tồn tại' })
  update(@Param('id') id: string, @Body() updateProductDto: UpdateProductDto) {
    const productId = parseInt(id, 10);
    if (isNaN(productId)) {
      throw new BadRequestException('ID sản phẩm không hợp lệ');
    }
    return this.adminProductsService.update(productId, updateProductDto);
  }

  @Patch(':id/status')
  @ApiOperation({
    summary: 'Cập nhật trạng thái sản phẩm (Ẩn/Hiện)',
    description: 'Soft delete - không xóa sản phẩm',
  })
  @ApiResponse({ status: 200, description: 'Cập nhật thành công' })
  @ApiResponse({ status: 404, description: 'Sản phẩm không tồn tại' })
  updateStatus(@Param('id') id: string, @Body() updateStatusDto: UpdateProductStatusDto) {
    const productId = parseInt(id, 10);
    if (isNaN(productId)) {
      throw new BadRequestException('ID sản phẩm không hợp lệ');
    }
    return this.adminProductsService.updateStatus(productId, updateStatusDto);
  }
}
