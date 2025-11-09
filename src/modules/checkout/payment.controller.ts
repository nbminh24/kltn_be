import { Controller, Get, Query, Res } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { PaymentService } from './payment.service';
import { Public } from '../../common/decorators/public.decorator';
import { Response } from 'express';
import { ConfigService } from '@nestjs/config';

@ApiTags('💳 Customer - Payment')
@Controller('api/v1/payment')
@Public()
export class PaymentController {
  constructor(
    private readonly paymentService: PaymentService,
    private readonly configService: ConfigService,
  ) {}

  @Get('vnpay-return')
  @ApiOperation({
    summary: '[UC-C11 Step 3] VNPAY callback/return URL',
    description: `
VNPAY gọi lại API này sau khi khách hàng thanh toán:
1. Nhận query params từ VNPAY
2. Verify chữ ký (signature) bằng secret key
3. Kiểm tra response code:
   - '00': Thanh toán thành công → Cập nhật order.payment_status='paid'
   - Khác: Thanh toán thất bại
4. Redirect khách hàng về frontend với kết quả

API này được VNPAY gọi, không cần authentication.
    `,
  })
  @ApiResponse({
    status: 302,
    description: 'Redirect về frontend với kết quả thanh toán',
  })
  async vnpayReturn(@Query() query: any, @Res() res: Response) {
    const result = await this.paymentService.handleVnpayReturn(query);

    // Redirect về frontend
    const frontendUrl = this.configService.get('FRONTEND_URL') || 'http://localhost:3000';
    
    if (result.success) {
      return res.redirect(`${frontendUrl}/checkout/success?orderId=${result.orderId}`);
    } else {
      return res.redirect(`${frontendUrl}/checkout/failure?message=${encodeURIComponent(result.message)}`);
    }
  }
}
