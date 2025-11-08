import { Controller, Get, Patch, Param, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { ProductVariantsService } from './product-variants.service';
import { UpdateVariantDto } from './dto/update-variant.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@ApiTags('Admin - Variants')
@Controller('api/v1/admin')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class AdminVariantsController {
  constructor(private readonly variantsService: ProductVariantsService) {}

  @Get('products/:id/variants')
  @ApiOperation({
    summary: 'Lấy danh sách variants của 1 sản phẩm',
    description: 'Lấy tất cả variants kèm thông tin size, color, images',
  })
  @ApiResponse({
    status: 200,
    description: 'Danh sách variants',
    schema: {
      example: {
        data: [
          {
            id: 10,
            sku: 'BOM-M-BLK',
            size_name: 'M',
            color_name: 'Đen',
            color_hex: '#000000',
            total_stock: 50,
            reserved_stock: 5,
            status: 'active',
            images: [
              { id: 101, image_url: 'https://...', is_main: true },
            ],
          },
        ],
      },
    },
  })
  findVariantsByProduct(@Param('id') id: string) {
    return this.variantsService.findByProduct(parseInt(id));
  }

  @Patch('variants/:id')
  @ApiOperation({
    summary: 'Cập nhật variant riêng lẻ',
    description: 'Cập nhật SKU hoặc status của 1 variant',
  })
  @ApiResponse({
    status: 200,
    description: 'Cập nhật thành công',
  })
  @ApiResponse({ status: 404, description: 'Variant không tồn tại' })
  @ApiResponse({ status: 409, description: 'SKU đã tồn tại' })
  updateVariant(
    @Param('id') id: string,
    @Body() updateVariantDto: UpdateVariantDto,
  ) {
    return this.variantsService.update(parseInt(id), updateVariantDto);
  }
}
