import { Controller, Get, Post, Param, Query, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { OrdersService } from './orders.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CreateOrderDto } from './dto/create-order.dto';

@ApiTags('Orders')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  @ApiOperation({ 
    summary: 'Tạo đơn hàng từ giỏ hàng',
    description: 'Tạo đơn hàng mới từ tất cả sản phẩm trong giỏ hàng. Bao gồm thông tin giao hàng, thanh toán và mã giảm giá.'
  })
  @ApiResponse({ status: 201, description: 'Đơn hàng được tạo thành công' })
  @ApiResponse({ status: 400, description: 'Giỏ hàng trống hoặc dữ liệu không hợp lệ' })
  createOrder(@CurrentUser() user: any, @Body() body: CreateOrderDto) {
    return this.ordersService.createOrder(user.userId, body);
  }

  @Get()
  @ApiOperation({ 
    summary: 'Danh sách đơn hàng của user',
    description: 'Lấy danh sách tất cả đơn hàng của user hiện tại với phân trang. Bao gồm chi tiết sản phẩm và trạng thái đơn hàng.'
  })
  @ApiResponse({ status: 200, description: 'Danh sách đơn hàng với phân trang' })
  getUserOrders(@CurrentUser() user: any, @Query() query: any) {
    return this.ordersService.getUserOrders(user.userId, query);
  }

  @Get(':id')
  @ApiOperation({ 
    summary: 'Chi tiết đơn hàng',
    description: 'Lấy thông tin chi tiết một đơn hàng bao gồm: sản phẩm, giá, địa chỉ giao hàng, trạng thái thanh toán và vận chuyển.'
  })
  @ApiResponse({ status: 200, description: 'Chi tiết đơn hàng' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy đơn hàng' })
  getOrderById(@CurrentUser() user: any, @Param('id') id: string) {
    return this.ordersService.getOrderById(user.userId, parseInt(id));
  }

  @Get(':id/tracking')
  @ApiOperation({ 
    summary: 'Tracking đơn hàng',
    description: 'Theo dõi tình trạng vận chuyển đơn hàng qua mã tracking_number và delivered_date.'
  })
  @ApiResponse({ status: 200, description: 'Thông tin tracking' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy đơn hàng' })
  getTracking(@CurrentUser() user: any, @Param('id') id: string) {
    return this.ordersService.getOrderById(user.userId, parseInt(id));
  }

  @Post(':id/cancel')
  @ApiOperation({ 
    summary: 'Hủy đơn hàng',
    description: 'Hủy đơn hàng khi đơn hàng đang ở trạng thái Pending hoặc Confirmed. Cập nhật trạng thái thành Cancelled.'
  })
  @ApiResponse({ status: 200, description: 'Hủy đơn hàng thành công' })
  @ApiResponse({ status: 400, description: 'Không thể hủy đơn hàng ở trạng thái hiện tại' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy đơn hàng' })
  cancelOrder(@CurrentUser() user: any, @Param('id') id: string) {
    return this.ordersService.cancelOrder(user.userId, parseInt(id));
  }
}
