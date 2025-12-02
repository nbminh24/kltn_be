import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';
import * as querystring from 'querystring';
import { Payment } from '../../entities/payment.entity';
import { Order } from '../../entities/order.entity';

@Injectable()
export class PaymentService {
    constructor(
        @InjectRepository(Payment)
        private paymentRepository: Repository<Payment>,
        @InjectRepository(Order)
        private orderRepository: Repository<Order>,
        private configService: ConfigService,
    ) { }

    sortObject(obj: any) {
        const sorted: any = {};
        const keys = Object.keys(obj).sort();
        keys.forEach(key => {
            sorted[key] = obj[key];
        });
        return sorted;
    }

    async createPaymentUrl(orderId: number, bankCode?: string, ipAddr: string = '127.0.0.1') {
        // Find order
        const order = await this.orderRepository.findOne({
            where: { id: orderId },
        });

        if (!order) {
            throw new NotFoundException('Không tìm thấy đơn hàng');
        }

        if (order.payment_status === 'paid') {
            throw new BadRequestException('Đơn hàng đã được thanh toán');
        }

        // VNPAY Config
        const vnpTmnCode = this.configService.get<string>('VNPAY_TMN_CODE');
        const vnpHashSecret = this.configService.get<string>('VNPAY_HASH_SECRET');
        const vnpUrl = this.configService.get<string>('VNPAY_URL') || 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html';
        const vnpReturnUrl = this.configService.get<string>('VNPAY_RETURN_URL') || 'http://localhost:3001/api/v1/payment/vnpay_return';

        if (!vnpTmnCode || !vnpHashSecret) {
            throw new BadRequestException('VNPAY chưa được cấu hình đầy đủ');
        }

        const createDate = new Date();
        const vnpTxnRef = `${orderId}_${createDate.getTime()}`; // Unique transaction ref
        const amount = Math.round(Number(order.total_amount) * 100); // VNPAY requires amount in VND * 100
        const locale = 'vn';
        const currCode = 'VND';

        const vnpParams: any = {
            vnp_Version: '2.1.0',
            vnp_Command: 'pay',
            vnp_TmnCode: vnpTmnCode,
            vnp_Locale: locale,
            vnp_CurrCode: currCode,
            vnp_TxnRef: vnpTxnRef,
            vnp_OrderInfo: `Thanh toan don hang ${orderId}`,
            vnp_OrderType: 'other',
            vnp_Amount: amount,
            vnp_ReturnUrl: vnpReturnUrl,
            vnp_IpAddr: ipAddr,
            vnp_CreateDate: this.formatDate(createDate),
        };

        if (bankCode) {
            vnpParams.vnp_BankCode = bankCode;
        }

        // Sort params
        const sortedParams = this.sortObject(vnpParams);

        // Create signature
        const signData = querystring.stringify(sortedParams);
        const hmac = crypto.createHmac('sha512', vnpHashSecret);
        const signed = hmac.update(Buffer.from(signData, 'utf-8')).digest('hex');
        vnpParams.vnp_SecureHash = signed;

        // Create payment URL
        const paymentUrl = vnpUrl + '?' + querystring.stringify(vnpParams);

        // Save payment record as pending
        const payment = this.paymentRepository.create({
            order_id: orderId,
            transaction_id: vnpTxnRef,
            amount: order.total_amount,
            provider: 'VNPAY',
            payment_method: 'bank_transfer',
            status: 'pending',
            response_data: {
                vnp_TxnRef: vnpTxnRef,
                created_at: createDate.toISOString(),
            },
        });

        await this.paymentRepository.save(payment);

        return {
            payment_url: paymentUrl,
            transaction_id: vnpTxnRef,
            order_id: orderId,
        };
    }

    async handleVnpayReturn(query: any) {
        const vnpHashSecret = this.configService.get<string>('VNPAY_HASH_SECRET');

        const vnpParams = { ...query };
        const secureHash = vnpParams.vnp_SecureHash;
        delete vnpParams.vnp_SecureHash;
        delete vnpParams.vnp_SecureHashType;

        // Sort params
        const sortedParams = this.sortObject(vnpParams);
        const signData = querystring.stringify(sortedParams);
        const hmac = crypto.createHmac('sha512', vnpHashSecret);
        const signed = hmac.update(Buffer.from(signData, 'utf-8')).digest('hex');

        if (secureHash !== signed) {
            return {
                success: false,
                message: 'Chữ ký không hợp lệ',
                code: 'INVALID_SIGNATURE',
            };
        }

        const vnpTxnRef = vnpParams.vnp_TxnRef;
        const vnpResponseCode = vnpParams.vnp_ResponseCode;

        // Find payment
        const payment = await this.paymentRepository.findOne({
            where: { transaction_id: vnpTxnRef },
            relations: ['order'],
        });

        if (!payment) {
            return {
                success: false,
                message: 'Không tìm thấy giao dịch',
                code: 'NOT_FOUND',
            };
        }

        // Check response code
        if (vnpResponseCode === '00') {
            // Payment success
            return {
                success: true,
                message: 'Thanh toán thành công',
                order_id: payment.order_id,
                amount: payment.amount,
                transaction_id: vnpTxnRef,
            };
        } else {
            // Payment failed
            return {
                success: false,
                message: 'Thanh toán thất bại',
                code: vnpResponseCode,
                order_id: payment.order_id,
            };
        }
    }

    async handleVnpayIpn(query: any) {
        const vnpHashSecret = this.configService.get<string>('VNPAY_HASH_SECRET');

        const vnpParams = { ...query };
        const secureHash = vnpParams.vnp_SecureHash;
        delete vnpParams.vnp_SecureHash;
        delete vnpParams.vnp_SecureHashType;

        // Sort params
        const sortedParams = this.sortObject(vnpParams);
        const signData = querystring.stringify(sortedParams);
        const hmac = crypto.createHmac('sha512', vnpHashSecret);
        const signed = hmac.update(Buffer.from(signData, 'utf-8')).digest('hex');

        if (secureHash !== signed) {
            return { RspCode: '97', Message: 'Invalid Signature' };
        }

        const vnpTxnRef = vnpParams.vnp_TxnRef;
        const vnpResponseCode = vnpParams.vnp_ResponseCode;
        const vnpAmount = vnpParams.vnp_Amount;

        // Find payment
        const payment = await this.paymentRepository.findOne({
            where: { transaction_id: vnpTxnRef },
            relations: ['order'],
        });

        if (!payment) {
            return { RspCode: '01', Message: 'Order Not Found' };
        }

        // Check amount
        const orderAmount = Math.round(Number(payment.amount) * 100);
        if (orderAmount !== parseInt(vnpAmount)) {
            return { RspCode: '04', Message: 'Invalid Amount' };
        }

        // Check if already processed
        if (payment.status === 'success') {
            return { RspCode: '02', Message: 'Order Already Confirmed' };
        }

        // Update payment status
        if (vnpResponseCode === '00') {
            payment.status = 'success';
            payment.response_data = {
                ...payment.response_data,
                vnpay_response: vnpParams,
                processed_at: new Date().toISOString(),
            };
            await this.paymentRepository.save(payment);

            // Update order payment_status
            const order = await this.orderRepository.findOne({
                where: { id: payment.order_id },
            });

            if (order) {
                order.payment_status = 'paid';
                await this.orderRepository.save(order);
            }

            return { RspCode: '00', Message: 'Confirm Success' };
        } else {
            // Payment failed
            payment.status = 'failed';
            payment.response_data = {
                ...payment.response_data,
                vnpay_response: vnpParams,
                processed_at: new Date().toISOString(),
            };
            await this.paymentRepository.save(payment);

            return { RspCode: '00', Message: 'Confirm Success' };
        }
    }

    private formatDate(date: Date): string {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        const seconds = String(date.getSeconds()).padStart(2, '0');
        return `${year}${month}${day}${hours}${minutes}${seconds}`;
    }
}
