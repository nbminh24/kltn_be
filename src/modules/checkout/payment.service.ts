import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { Order } from '../../entities/order.entity';
import * as crypto from 'crypto';
import * as querystring from 'qs';

@Injectable()
export class PaymentService {
  private vnpTmnCode: string;
  private vnpHashSecret: string;
  private vnpUrl: string;
  private vnpReturnUrl: string;

  constructor(
    @InjectRepository(Order)
    private orderRepository: Repository<Order>,
    private configService: ConfigService,
  ) {
    // VNPAY Sandbox config - User cần thêm vào .env
    this.vnpTmnCode = this.configService.get('VNPAY_TMN_CODE') || '';
    this.vnpHashSecret = this.configService.get('VNPAY_HASH_SECRET') || '';
    this.vnpUrl =
      this.configService.get('VNPAY_URL') || 'https://sandbox.vnpayment.vn/paymentv2/vpcpay.html';
    this.vnpReturnUrl =
      this.configService.get('VNPAY_RETURN_URL') ||
      'http://localhost:3001/api/v1/payment/vnpay-return';

    // Debug logging
    console.log('🔧 VNPAY Config loaded:');
    console.log('  - TMN Code:', this.vnpTmnCode || '❌ MISSING');
    console.log('  - Hash Secret:', this.vnpHashSecret ? '✅ EXISTS' : '❌ MISSING');
    console.log('  - URL:', this.vnpUrl);
    console.log('  - Return URL:', this.vnpReturnUrl);

    if (!this.vnpTmnCode || !this.vnpHashSecret) {
      console.error('⚠️ WARNING: VNPAY credentials missing in .env file!');
      console.error('Please add: VNPAY_TMN_CODE and VNPAY_HASH_SECRET');
    }
  }

  /**
   * UC-C11 Step 2: Create VNPAY payment URL
   */
  async createPaymentUrl(orderId: number, ipAddr: string): Promise<string> {
    // Get order
    const order = await this.orderRepository.findOne({ where: { id: orderId } });
    if (!order) {
      throw new NotFoundException('Không tìm thấy đơn hàng');
    }

    // Check if already paid
    if (order.payment_status === 'paid') {
      throw new Error('Đơn hàng đã được thanh toán');
    }

    const createDate = this.formatDate(new Date());
    const expireDate = this.formatDate(new Date(Date.now() + 15 * 60 * 1000)); // +15 minutes
    const amount = Math.round(parseFloat(order.total_amount.toString()) * 100); // VNPay requires amount in VND * 100

    let vnpParams: any = {
      vnp_Version: '2.1.0',
      vnp_Command: 'pay',
      vnp_TmnCode: this.vnpTmnCode,
      vnp_Amount: amount,
      vnp_CreateDate: createDate,
      vnp_CurrCode: 'VND',
      vnp_IpAddr: ipAddr,
      vnp_Locale: 'vn',
      vnp_OrderInfo: `Payment for order ${orderId}`,
      vnp_OrderType: 'other',
      vnp_ReturnUrl: this.vnpReturnUrl,
      vnp_TxnRef: orderId.toString(),
      vnp_ExpireDate: expireDate,
    };

    // Sort params
    vnpParams = this.sortObject(vnpParams);

    // Build signData with URL encoding (as per VNPAY Java demo)
    const signDataArray: string[] = [];
    Object.keys(vnpParams).forEach(key => {
      const value = vnpParams[key];
      if (value !== '' && value !== undefined && value !== null) {
        // Encode both key and value as per VNPAY spec
        const encodedValue = encodeURIComponent(value).replace(/%20/g, '+');
        signDataArray.push(`${key}=${encodedValue}`);
      }
    });
    const signData = signDataArray.join('&');

    // Create HMAC SHA512 signature
    const hmac = crypto.createHmac('sha512', this.vnpHashSecret);
    const signed = hmac.update(Buffer.from(signData, 'utf-8')).digest('hex');
    vnpParams['vnp_SecureHash'] = signed;

    // Debug logging
    console.log('🔐 VNPAY Payment URL Generation:');
    console.log('  - Order ID:', orderId);
    console.log('  - Amount:', amount, '(VND x 100)');
    console.log('  - Hash Secret:', this.vnpHashSecret);
    console.log('  - Sign Data (RAW):', signData);
    console.log('  - Signature:', signed);

    // Build URL (WITH encoding for URL safety)
    const paymentUrl = this.vnpUrl + '?' + querystring.stringify(vnpParams, { encode: true });

    return paymentUrl;
  }

  /**
   * UC-C11 Step 3: Handle VNPAY return/callback
   */
  async handleVnpayReturn(
    vnpParams: any,
  ): Promise<{ success: boolean; orderId: number; message: string }> {
    const secureHash = vnpParams['vnp_SecureHash'];
    delete vnpParams['vnp_SecureHash'];
    delete vnpParams['vnp_SecureHashType'];

    // Sort and verify signature
    const sortedParams = this.sortObject(vnpParams);
    const signData = querystring.stringify(sortedParams, { encode: false });
    const hmac = crypto.createHmac('sha512', this.vnpHashSecret);
    const signed = hmac.update(Buffer.from(signData, 'utf-8')).digest('hex');

    if (secureHash !== signed) {
      return {
        success: false,
        orderId: 0,
        message: 'Chữ ký không hợp lệ',
      };
    }

    const orderId = parseInt(vnpParams['vnp_TxnRef']);
    const responseCode = vnpParams['vnp_ResponseCode'];

    // Find order
    const order = await this.orderRepository.findOne({ where: { id: orderId } });
    if (!order) {
      return {
        success: false,
        orderId,
        message: 'Không tìm thấy đơn hàng',
      };
    }

    // Update payment status based on response code
    if (responseCode === '00') {
      // Success
      order.payment_status = 'paid';
      await this.orderRepository.save(order);

      return {
        success: true,
        orderId,
        message: 'Thanh toán thành công',
      };
    } else {
      // Failed
      return {
        success: false,
        orderId,
        message: 'Thanh toán thất bại',
      };
    }
  }

  /**
   * Helper: Sort object by key
   */
  private sortObject(obj: any): any {
    const sorted: any = {};
    const keys = Object.keys(obj).sort();
    keys.forEach(key => {
      sorted[key] = obj[key];
    });
    return sorted;
  }

  /**
   * Helper: Format date to yyyyMMddHHmmss
   */
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
