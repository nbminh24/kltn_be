import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { CategoriesService } from './categories.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@ApiTags('Admin - Categories')
@Controller('api/v1/admin/categories')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class AdminCategoriesController {
  constructor(private readonly categoriesService: CategoriesService) {}

  @Get('stats')
  @ApiOperation({
    summary: 'Lấy thống kê categories',
    description: 'Lấy tổng số categories, categories active, và tổng số products',
  })
  @ApiResponse({
    status: 200,
    description: 'Thống kê thành công',
    schema: {
      example: {
        total_categories: 6,
        active_categories: 5,
        total_products: 160,
      },
    },
  })
  getStats() {
    return this.categoriesService.getStats();
  }

  @Get('all')
  @ApiOperation({
    summary: 'Lấy tất cả categories (cho dropdown)',
    description: 'Không pagination, trả về tất cả categories active',
  })
  findAllForDropdown() {
    return this.categoriesService.findAllActive();
  }

  @Get()
  @ApiOperation({
    summary: 'Lấy danh sách categories (Admin)',
    description: 'Lấy tất cả categories với product_count',
  })
  @ApiResponse({
    status: 200,
    description: 'Danh sách categories',
    schema: {
      example: {
        data: [
          { id: 1, name: 'T-Shirts', slug: 't-shirts', status: 'active', product_count: 45 },
          { id: 5, name: 'Shorts', slug: 'shorts', status: 'inactive', product_count: 19 },
        ],
      },
    },
  })
  findAll() {
    return this.categoriesService.findAllForAdmin();
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Lấy thông tin chi tiết category',
    description: 'Lấy thông tin chi tiết một category theo ID',
  })
  @ApiResponse({
    status: 200,
    description: 'Chi tiết category',
    schema: {
      example: {
        id: 1,
        name: 'T-Shirts',
        slug: 't-shirts',
        status: 'active',
        product_count: 45,
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Category không tồn tại' })
  findOne(@Param('id') id: string) {
    const categoryId = parseInt(id, 10);
    if (isNaN(categoryId)) {
      throw new BadRequestException('ID category không hợp lệ');
    }
    return this.categoriesService.findOne(categoryId);
  }

  @Post()
  @ApiOperation({
    summary: 'Tạo category mới',
    description: 'Tạo category mới, slug sẽ được tạo tự động từ name',
  })
  @ApiResponse({
    status: 201,
    description: 'Tạo category thành công',
    schema: {
      example: {
        id: 7,
        name: 'Hoodies',
        slug: 'hoodies',
        status: 'active',
        product_count: 0,
      },
    },
  })
  @ApiResponse({ status: 409, description: 'Tên category đã tồn tại' })
  create(@Body() createCategoryDto: CreateCategoryDto) {
    return this.categoriesService.create(createCategoryDto);
  }

  @Put(':id')
  @ApiOperation({
    summary: 'Cập nhật category',
    description:
      'Cập nhật name và/hoặc status của category. Slug sẽ tự động cập nhật nếu name thay đổi.',
  })
  @ApiResponse({
    status: 200,
    description: 'Cập nhật thành công',
    schema: {
      example: {
        id: 5,
        name: 'Shorts',
        slug: 'shorts',
        status: 'active',
        product_count: 19,
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Category không tồn tại' })
  @ApiResponse({ status: 409, description: 'Tên category đã tồn tại' })
  update(@Param('id') id: string, @Body() updateCategoryDto: UpdateCategoryDto) {
    const categoryId = parseInt(id, 10);
    if (isNaN(categoryId)) {
      throw new BadRequestException('ID category không hợp lệ');
    }
    return this.categoriesService.update(categoryId, updateCategoryDto);
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Xóa category',
    description: 'Xóa category. Không thể xóa nếu còn sản phẩm.',
  })
  @ApiResponse({
    status: 200,
    description: 'Xóa thành công',
    schema: {
      example: {
        message: 'Xóa category thành công',
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Category không tồn tại' })
  @ApiResponse({ status: 409, description: 'Không thể xóa vì còn sản phẩm' })
  delete(@Param('id') id: string) {
    const categoryId = parseInt(id, 10);
    if (isNaN(categoryId)) {
      throw new BadRequestException('ID category không hợp lệ');
    }
    return this.categoriesService.delete(categoryId);
  }
}
