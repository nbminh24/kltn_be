import { Controller, Get, Post, Put, Param, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { SizesService } from './sizes.service';
import { CreateSizeDto } from './dto/create-size.dto';
import { UpdateSizeDto } from './dto/update-size.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@ApiTags('Admin - Products')
@Controller('api/v1/admin/sizes')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class AdminSizesController {
  constructor(private readonly sizesService: SizesService) {}

  @Get()
  @ApiOperation({
    summary: 'Lấy danh sách sizes (paginated)',
    description: 'Hỗ trợ pagination, sort, search',
  })
  @ApiResponse({
    status: 200,
    description: 'Danh sách sizes',
    schema: {
      example: {
        data: [
          { id: 1, name: 'S', sort_order: 1 },
          { id: 2, name: 'M', sort_order: 2 },
        ],
        metadata: {
          total: 6,
          page: 1,
          limit: 20,
          total_pages: 1,
        },
      },
    },
  })
  findAll(@Query() query: any) {
    return this.sizesService.findAll(query);
  }

  @Get('all')
  @ApiOperation({
    summary: 'Lấy tất cả sizes (cho dropdown)',
    description: 'Không pagination, trả về tất cả sizes',
  })
  findAllForDropdown() {
    return this.sizesService.findAllForDropdown();
  }

  @Post()
  @ApiOperation({ summary: 'Tạo size mới' })
  @ApiResponse({ status: 201, description: 'Tạo thành công' })
  @ApiResponse({ status: 409, description: 'Tên size đã tồn tại' })
  create(@Body() createSizeDto: CreateSizeDto) {
    return this.sizesService.create(createSizeDto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Cập nhật size' })
  @ApiResponse({ status: 200, description: 'Cập nhật thành công' })
  @ApiResponse({ status: 404, description: 'Size không tồn tại' })
  @ApiResponse({ status: 409, description: 'Tên size đã tồn tại' })
  update(@Param('id') id: string, @Body() updateSizeDto: UpdateSizeDto) {
    return this.sizesService.update(parseInt(id), updateSizeDto);
  }
}
