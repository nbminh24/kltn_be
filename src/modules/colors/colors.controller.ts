import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { ColorsService } from './colors.service';

@ApiTags('Public - Products')
@Controller('api/v1/colors')
export class ColorsController {
  constructor(private readonly colorsService: ColorsService) {}

  @Get()
  @ApiOperation({
    summary: 'Lấy danh sách colors (paginated)',
    description: 'Hỗ trợ pagination, sort, search',
  })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Số trang (default: 1)' })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Số items mỗi trang (default: 20)',
  })
  @ApiQuery({ name: 'search', required: false, type: String, description: 'Tìm kiếm theo tên màu' })
  @ApiQuery({
    name: 'sort',
    required: false,
    type: String,
    description: 'Sắp xếp (vd: name:asc, id:desc)',
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
  @ApiResponse({
    status: 200,
    description: 'Danh sách tất cả colors',
    schema: {
      example: [
        { id: 1, name: 'Trắng', hex_code: '#FFFFFF' },
        { id: 2, name: 'Đen', hex_code: '#000000' },
      ],
    },
  })
  findAllForDropdown() {
    return this.colorsService.findAllForDropdown();
  }
}
