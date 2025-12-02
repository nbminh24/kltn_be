import { Controller, Get, Post, Param, Query, UseGuards, BadRequestException } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { OrdersService } from './orders.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('📦 Orders')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) { }

  @Get('track')
  @Public()
  @ApiOperation({
    summary: 'Tracking đơn hàng (Public)',
    description: 'Tra cứu thông tin đơn hàng bằng order_id hoặc phone + email. Dùng cho chatbot.',
  })
  @ApiQuery({ name: 'order_id', required: false, type: Number, example: 123 })
  @ApiQuery({ name: 'phone', required: false, type: String, example: '0912345678' })
  @ApiQuery({ name: 'email', required: false, type: String, example: 'user@example.com' })
  @ApiResponse({ status: 200, description: 'Thông tin đơn hàng' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy đơn hàng' })
  trackOrder(@Query() query: any) {
    return this.ordersService.trackOrder(query);
  }

  @Get()
  @ApiOperation({
    summary: '[UC-C12] Lịch sử đơn hàng',
    description: 'Lấy danh sách tất cả đơn hàng của khách hàng với phân trang và filter theo trạng thái. Sắp xếp theo mới nhất.'
  })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'limit', required: false, example: 10 })
  @ApiQuery({ name: 'status', required: false, example: 'pending', description: 'Filter: pending | processing | shipped | delivered | cancelled' })
  @ApiResponse({ status: 200, description: 'Danh sách đơn hàng với phân trang' })
  getUserOrders(@CurrentUser() user: any, @Query() query: any) {
    return this.ordersService.getUserOrders(user.sub, query);
  }

  @Get(':id')
  @ApiOperation({
    summary: '[UC-C12] Chi tiết đơn hàng',
    description: 'Lấy thông tin chi tiết một đơn hàng bao gồm: order_items (sản phẩm + giá tại thời điểm mua), địa chỉ giao hàng, trạng thái thanh toán và vận chuyển.'
  })
  @ApiResponse({ status: 200, description: 'Chi tiết đơn hàng đầy đủ' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy đơn hàng' })
  getOrderById(@CurrentUser() user: any, @Param('id') id: string) {
    const orderId = parseInt(id, 10);
    if (isNaN(orderId)) {
      throw new BadRequestException('ID đơn hàng không hợp lệ');
    }
    return this.ordersService.getOrderById(user.sub, orderId);
  }

  @Get(':id/status-history')
  @ApiOperation({
    summary: '[UC-C12] Lịch sử trạng thái đơn hàng',
    description: 'Xem timeline lịch sử các trạng thái của đơn hàng (pending → processing → shipped → delivered). Hiển thị thời gian và admin xử lý.'
  })
  @ApiResponse({ status: 200, description: 'Timeline trạng thái đơn hàng' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy đơn hàng' })
  getStatusHistory(@CurrentUser() user: any, @Param('id') id: string) {
    const orderId = parseInt(id, 10);
    if (isNaN(orderId)) {
      throw new BadRequestException('ID đơn hàng không hợp lệ');
    }
    return this.ordersService.getStatusHistory(user.sub, orderId);
  }

  @Post(':id/cancel')
  @ApiOperation({
    summary: 'Hủy đơn hàng',
    description: 'Hủy đơn hàng khi đơn hàng đang ở trạng thái pending. Hoàn lại kho (giảm reserved_stock).'
  })
  @ApiResponse({ status: 200, description: 'Hủy đơn hàng thành công' })
  @ApiResponse({ status: 400, description: 'Không thể hủy đơn hàng ở trạng thái hiện tại' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy đơn hàng' })
  cancelOrder(@CurrentUser() user: any, @Param('id') id: string) {
    const orderId = parseInt(id, 10);
    if (isNaN(orderId)) {
      throw new BadRequestException('ID đơn hàng không hợp lệ');
    }
    return this.ordersService.cancelOrder(user.sub, orderId);
  }
}
