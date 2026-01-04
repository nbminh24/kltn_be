import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { SizesService } from './sizes.service';

@ApiTags('Public - Products')
@Controller('api/v1/sizes')
export class SizesController {
  constructor(private readonly sizesService: SizesService) {}

  @Get()
  @ApiOperation({
    summary: 'Lấy danh sách sizes (paginated)',
    description: 'Hỗ trợ pagination, sort, search',
  })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Số trang (default: 1)' })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Số items mỗi trang (default: 20)',
  })
  @ApiQuery({
    name: 'search',
    required: false,
    type: String,
    description: 'Tìm kiếm theo tên size',
  })
  @ApiQuery({
    name: 'sort',
    required: false,
    type: String,
    description: 'Sắp xếp (vd: sort_order:asc, name:asc)',
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
    description: 'Không pagination, trả về tất cả sizes theo thứ tự sort_order',
  })
  @ApiResponse({
    status: 200,
    description: 'Danh sách tất cả sizes',
    schema: {
      example: [
        { id: 1, name: 'S', sort_order: 1 },
        { id: 2, name: 'M', sort_order: 2 },
        { id: 3, name: 'L', sort_order: 3 },
      ],
    },
  })
  findAllForDropdown() {
    return this.sizesService.findAllForDropdown();
  }
}
