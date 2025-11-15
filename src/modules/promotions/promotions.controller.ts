import { Controller, Get, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { PromotionsService } from './promotions.service';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('Checkout')
@Controller('promotions')
@Public()
export class PromotionsController {
  constructor(private readonly promotionsService: PromotionsService) {}

  @Get('public')
  @ApiOperation({
    summary: 'Danh sách mã giảm giá công khai',
    description:
      'Lấy danh sách các mã giảm giá đang hoạt động, chưa hết hạn và còn lượt sử dụng. Dành cho customer xem.',
  })
  @ApiQuery({ name: 'type', required: false, example: 'percentage', description: 'Lọc theo loại giảm giá' })
  @ApiResponse({ status: 200, description: 'Danh sách mã giảm giá active' })
  getActivePromotions(@Query() query: any) {
    return this.promotionsService.getActivePromotions(query);
  }
}
