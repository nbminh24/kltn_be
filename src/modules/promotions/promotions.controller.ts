import { Controller, Get, Post, Query, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { PromotionsService } from './promotions.service';
import { Public } from '../../common/decorators/public.decorator';
import { ValidatePromotionDto } from './dto/validate-promotion.dto';

@ApiTags('🎯 Promotions')
@Controller('promotions')
@Public()
export class PromotionsController {
  constructor(private readonly promotionsService: PromotionsService) { }

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

  @Post('validate')
  @ApiOperation({
    summary: 'Validate mã giảm giá',
    description: 'Kiểm tra tính hợp lệ của mã giảm giá: còn hạn, còn lượt dùng, có áp dụng gộp không. Dùng cho chatbot và checkout.',
  })
  @ApiResponse({ status: 200, description: 'Kết quả validate' })
  validatePromotions(@Body() dto: ValidatePromotionDto) {
    return this.promotionsService.validatePromotions(dto);
  }

  @Post('validate-mix')
  @ApiOperation({
    summary: '[Chatbot] Kiểm tra logic gộp mã giảm giá',
    description: 'Kiểm tra xem có thể dùng nhiều mã giảm giá cùng lúc không. Dùng cho intent: check_discount_logic',
  })
  @ApiResponse({ status: 200, description: 'Kết quả kiểm tra logic gộp mã' })
  validateMix(@Body() dto: any) {
    return this.promotionsService.validateMix(dto);
  }

  @Get('active')
  @ApiOperation({
    summary: 'Promotions đang active',
    description: 'Alias của /promotions/public - Lấy promotions active cho homepage.',
  })
  @ApiResponse({ status: 200, description: 'Danh sách promotions active' })
  getActive(@Query() query: any) {
    return this.promotionsService.getActivePromotions(query);
  }
}
