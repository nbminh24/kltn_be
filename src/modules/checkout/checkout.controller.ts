import { Controller, Post, Body, UseGuards, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { CheckoutService } from './checkout.service';
import { PaymentService } from './payment.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CreateOrderDto } from './dto/create-order.dto';
import { CreatePaymentUrlDto } from './dto/create-payment-url.dto';

@ApiTags('🛒 Cart & Checkout')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('api/v1/checkout')
export class CheckoutController {
  constructor(
    private readonly checkoutService: CheckoutService,
    private readonly paymentService: PaymentService,
  ) { }

  @Post()
  @ApiOperation({
    summary: '[UC-C11 Step 1] Tạo đơn hàng từ giỏ hàng',
    description: `
Tạo đơn hàng mới từ tất cả sản phẩm trong giỏ hàng với TRANSACTION:
1. Lấy cart items và địa chỉ giao hàng
2. Kiểm tra tồn kho cho TẤT CẢ items
3. Tính tổng tiền (subtotal + shipping_fee)
4. Tạo order với status: payment_status='unpaid', fulfillment_status='pending'
5. Tạo order_items với giá tại thời điểm mua (price_at_purchase)
6. Trừ kho (tăng reserved_stock)
7. Xóa cart items

Nếu có lỗi, rollback toàn bộ transaction.
    `,
  })
  @ApiResponse({
    status: 201,
    description: 'Tạo đơn hàng thành công. Nếu payment_method=vnpay, cần gọi API create-payment-url tiếp theo.',
  })
  @ApiResponse({ status: 400, description: 'Giỏ hàng trống hoặc không đủ hàng' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy địa chỉ giao hàng' })
  createOrder(@CurrentUser() user: any, @Body() dto: CreateOrderDto) {
    return this.checkoutService.createOrder(user.sub, dto);
  }

  @Post('create-payment-url')
  @ApiOperation({
    summary: '[UC-C11 Step 2] Tạo link thanh toán VNPAY',
    description: `
Lấy payment URL từ VNPAY cho đơn hàng vừa tạo:
1. Kiểm tra order tồn tại và chưa thanh toán
2. Tạo VNPAY params (amount, order_id, return_url)
3. Ký bằng HMAC SHA512 với secret key
4. Trả về payment URL

Frontend redirect khách hàng đến URL này để thanh toán.
    `,
  })
  @ApiResponse({
    status: 200,
    description: 'Payment URL thành công',
    schema: {
      example: {
        paymentUrl: 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html?...',
      },
    },
  })
  @ApiResponse({ status: 404, description: 'Không tìm thấy đơn hàng' })
  async createPaymentUrl(@Body() dto: CreatePaymentUrlDto, @Req() req: any) {
    const ipAddr = req.ip || req.connection.remoteAddress || '127.0.0.1';
    const paymentUrl = await this.paymentService.createPaymentUrl(dto.order_id, ipAddr);
    return { paymentUrl };
  }
}
