import { Controller, Get, Query, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiSecurity } from '@nestjs/swagger';
import { InternalService } from './internal.service';
import { ApiKeyGuard } from '../../common/guards/api-key.guard';

@ApiTags('Internal')
@ApiSecurity('api-key')
@UseGuards(ApiKeyGuard)
@Controller('internal')
export class InternalController {
  constructor(private readonly internalService: InternalService) {}

  @Get('orders/:id')
  @ApiOperation({
    summary: '[Internal] Tra cứu đơn hàng',
    description: 'API cho Rasa Action Server tra cứu thông tin đơn hàng. Cần API Key.',
  })
  @ApiResponse({ status: 200, description: 'Trả về thông tin đơn hàng' })
  getOrderById(@Param('id') orderId: string) {
    return this.internalService.getOrderById(orderId);
  }

  @Get('products')
  @ApiOperation({
    summary: '[Internal] Tìm kiếm sản phẩm',
    description: 'API cho Rasa Action Server tìm kiếm sản phẩm. Cần API Key.',
  })
  @ApiResponse({ status: 200, description: 'Trả về danh sách sản phẩm' })
  searchProducts(@Query('query') query: string, @Query('limit') limit?: number) {
    return this.internalService.searchProducts(query, limit || 10);
  }

  @Get('faq')
  @ApiOperation({
    summary: '[Internal] Tra cứu FAQ/Content',
    description: 'API cho Rasa Action Server tra cứu nội dung FAQ, policies. Cần API Key.',
  })
  @ApiResponse({ status: 200, description: 'Trả về nội dung tìm được' })
  searchFaq(@Query('query') query: string) {
    return this.internalService.searchFaq(query);
  }

  @Get('users/email/:email')
  @ApiOperation({
    summary: '[Internal] Tra cứu user theo email',
    description: 'API cho Rasa Action Server tra cứu thông tin user. Cần API Key.',
  })
  @ApiResponse({ status: 200, description: 'Trả về thông tin user' })
  getUserByEmail(@Param('email') email: string) {
    return this.internalService.getUserByEmail(email);
  }
}
