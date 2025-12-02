import { Controller, Post, Get, Body, Query, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Request } from 'express';
import { PaymentService } from './payment.service';
import { CreatePaymentUrlDto } from './dto/create-payment-url.dto';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('Payment')
@Controller('payment')
export class PaymentController {
    constructor(private readonly paymentService: PaymentService) { }

    @Post('create_url')
    @Public()
    @ApiOperation({
        summary: 'Tạo URL thanh toán VNPAY',
        description: 'Tạo URL redirect đến VNPAY để thanh toán đơn hàng',
    })
    @ApiResponse({ status: 201, description: 'URL thanh toán được tạo thành công' })
    @ApiResponse({ status: 404, description: 'Không tìm thấy đơn hàng' })
    async createPaymentUrl(@Body() dto: CreatePaymentUrlDto, @Req() req: Request) {
        const ipAddr = req.ip || req.connection.remoteAddress || '127.0.0.1';
        return this.paymentService.createPaymentUrl(dto.order_id, dto.bank_code, ipAddr);
    }

    @Get('vnpay_return')
    @Public()
    @ApiOperation({
        summary: 'VNPAY Return URL',
        description: 'Callback từ VNPAY sau khi user thanh toán (để redirect về FE)',
    })
    @ApiResponse({ status: 200, description: 'Kết quả thanh toán' })
    async vnpayReturn(@Query() query: any) {
        return this.paymentService.handleVnpayReturn(query);
    }

    @Get('vnpay_ipn')
    @Public()
    @ApiOperation({
        summary: 'VNPAY IPN (Instant Payment Notification)',
        description: 'Webhook từ VNPAY để confirm thanh toán (không qua browser)',
    })
    @ApiResponse({ status: 200, description: 'IPN response' })
    async vnpayIpn(@Query() query: any) {
        return this.paymentService.handleVnpayIpn(query);
    }
}
