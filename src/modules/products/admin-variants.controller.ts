import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Param,
  Body,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { ProductVariantsService } from './product-variants.service';
import { UpdateVariantDto } from './dto/update-variant.dto';
import { UpdateVariantStockDto } from './dto/admin-update-variant-stock.dto';
import { CreateSingleVariantDto } from './dto/admin-create-single-variant.dto';
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
            images: [{ id: 101, image_url: 'https://...', is_main: true }],
          },
        ],
      },
    },
  })
  findVariantsByProduct(@Param('id') id: string) {
    const productId = parseInt(id, 10);
    if (isNaN(productId)) {
      throw new BadRequestException('ID sản phẩm không hợp lệ');
    }
    return this.variantsService.findByProduct(productId);
  }

  @Post('products/:productId/variants')
  @ApiOperation({
    summary: 'Tạo variant mới cho sản phẩm',
    description:
      'Tạo 1 variant mới với size_id, color_id, và stock. SKU tự động generate nếu không cung cấp.',
  })
  @ApiResponse({
    status: 201,
    description: 'Tạo thành công',
    schema: {
      example: {
        message: 'Tạo variant thành công',
        variant: {
          id: 101,
          sku: 'PRODUCT-1-SIZE-1-COLOR-3',
          size_id: 1,
          color_id: 3,
          total_stock: 100,
          status: 'active',
        },
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Sản phẩm không tồn tại' })
  @ApiResponse({ status: 409, description: 'SKU đã tồn tại' })
  createVariant(@Param('productId') productId: string, @Body() createDto: CreateSingleVariantDto) {
    const parsedProductId = parseInt(productId, 10);
    if (isNaN(parsedProductId)) {
      throw new BadRequestException('ID sản phẩm không hợp lệ');
    }
    return this.variantsService.createVariant(parsedProductId, createDto);
  }

  @Put('products/:productId/variants/:id')
  @ApiOperation({
    summary: 'Cập nhật stock và status của variant',
    description:
      'Chỉ cho phép update total_stock và status. SKU, size_id, color_id KHÔNG được thay đổi.',
  })
  @ApiResponse({
    status: 200,
    description: 'Cập nhật thành công',
    schema: {
      example: {
        message: 'Cập nhật variant thành công',
        variant: {
          id: 1,
          sku: 'AO--1-Đỏ-S',
          total_stock: 150,
          reserved_stock: 0,
          status: 'active',
        },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Variant không thuộc về product này' })
  @ApiResponse({ status: 404, description: 'Variant không tồn tại' })
  updateVariantStock(
    @Param('productId') productId: string,
    @Param('id') id: string,
    @Body() updateDto: UpdateVariantStockDto,
  ) {
    const parsedProductId = parseInt(productId, 10);
    const parsedVariantId = parseInt(id, 10);

    if (isNaN(parsedProductId)) {
      throw new BadRequestException('ID sản phẩm không hợp lệ');
    }
    if (isNaN(parsedVariantId)) {
      throw new BadRequestException('ID variant không hợp lệ');
    }

    return this.variantsService.updateVariantStock(parsedProductId, parsedVariantId, updateDto);
  }

  @Put('variants/:id')
  @Patch('variants/:id')
  @ApiOperation({
    summary: 'Cập nhật variant riêng lẻ',
    description: 'Cập nhật SKU hoặc status của 1 variant. Support cả PUT và PATCH.',
  })
  @ApiResponse({
    status: 200,
    description: 'Cập nhật thành công',
  })
  @ApiResponse({ status: 404, description: 'Variant không tồn tại' })
  @ApiResponse({ status: 409, description: 'SKU đã tồn tại' })
  updateVariant(@Param('id') id: string, @Body() updateVariantDto: UpdateVariantDto) {
    const variantId = parseInt(id, 10);
    if (isNaN(variantId)) {
      throw new BadRequestException('ID variant không hợp lệ');
    }
    return this.variantsService.update(variantId, updateVariantDto);
  }
}
