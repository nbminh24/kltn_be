import { Controller, Get, Post, Put, Param, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { ColorsService } from './colors.service';
import { CreateColorDto } from './dto/create-color.dto';
import { UpdateColorDto } from './dto/update-color.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@ApiTags('Admin - Colors')
@Controller('api/v1/admin/colors')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class AdminColorsController {
  constructor(private readonly colorsService: ColorsService) {}

  @Get()
  @ApiOperation({
    summary: 'Lấy danh sách colors (paginated)',
    description: 'Hỗ trợ pagination, sort, search',
  })
  @ApiResponse({
    status: 200,
    description: 'Danh sách colors',
    schema: {
      example: {
        data: [
          { id: 1, name: 'Trắng', hex_code: '#FFFFFF' },
          { id: 2, name: 'Đen', hex_code: '#000000' },
        ],
        metadata: {
          total: 8,
          page: 1,
          limit: 20,
          total_pages: 1,
        },
      },
    },
  })
  findAll(@Query() query: any) {
    return this.colorsService.findAll(query);
  }

  @Get('all')
  @ApiOperation({
    summary: 'Lấy tất cả colors (cho dropdown)',
    description: 'Không pagination, trả về tất cả colors',
  })
  findAllForDropdown() {
    return this.colorsService.findAllForDropdown();
  }

  @Post()
  @ApiOperation({ summary: 'Tạo color mới' })
  @ApiResponse({ status: 201, description: 'Tạo thành công' })
  @ApiResponse({ status: 409, description: 'Tên màu đã tồn tại' })
  create(@Body() createColorDto: CreateColorDto) {
    return this.colorsService.create(createColorDto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Cập nhật color' })
  @ApiResponse({ status: 200, description: 'Cập nhật thành công' })
  @ApiResponse({ status: 404, description: 'Màu không tồn tại' })
  @ApiResponse({ status: 409, description: 'Tên màu đã tồn tại' })
  update(@Param('id') id: string, @Body() updateColorDto: UpdateColorDto) {
    return this.colorsService.update(parseInt(id), updateColorDto);
  }
}
