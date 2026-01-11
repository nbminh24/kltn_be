import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class EmailService {
  private transporter: nodemailer.Transporter;
  private readonly logger = new Logger(EmailService.name);

  constructor(private configService: ConfigService) {
    // Initialize nodemailer transporter
    this.transporter = nodemailer.createTransport({
      host: this.configService.get('MAIL_HOST', 'smtp.gmail.com'),
      port: parseInt(this.configService.get('MAIL_PORT', '587')),
      secure: false, // true for 465, false for other ports
      auth: {
        user: this.configService.get('EMAIL_USER'),
        pass: this.configService.get('EMAIL_PASS'),
      },
    });

    // Log configuration (without password)
    this.logger.log(`Email service initialized with ${this.configService.get('EMAIL_USER')}`);
  }

  async sendActivationEmail(email: string, name: string, token: string) {
    // Link trỏ thẳng tới backend API để xử lý
    const backendUrl = this.configService.get('BACKEND_URL', 'http://localhost:3001');
    const activationLink = `${backendUrl}/api/v1/auth/activate?token=${token}`;

    try {
      await this.transporter.sendMail({
        from: `"LeCas Fashion" <${this.configService.get('EMAIL_USER')}>`,
        to: email,
        subject: 'Kích hoạt tài khoản của bạn - LeCas Fashion',
        html: this.getActivationEmailTemplate(name, activationLink),
      });

      this.logger.log(`✅ Activation email sent successfully to ${email}`);
      return true;
    } catch (error) {
      this.logger.error(`❌ Failed to send activation email to ${email}:`, error.message);
      // Throw error để user biết có vấn đề
      throw error;
    }
  }

  async sendPasswordResetEmail(email: string, name: string, token: string) {
    const resetLink = `${this.configService.get('FRONTEND_URL')}/reset-password?token=${token}`;

    try {
      await this.transporter.sendMail({
        from: `"LeCas Fashion" <${this.configService.get('EMAIL_USER')}>`,
        to: email,
        subject: 'Đặt lại mật khẩu - LeCas Fashion',
        html: this.getPasswordResetEmailTemplate(name, resetLink),
      });

      this.logger.log(`Password reset email sent to ${email}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to send password reset email to ${email}`, error.stack);
      return false;
    }
  }

  async sendWelcomeEmail(email: string, name: string) {
    try {
      await this.transporter.sendMail({
        from: `"LeCas Fashion" <${this.configService.get('EMAIL_USER')}>`,
        to: email,
        subject: 'Chào mừng đến với LeCas Fashion',
        html: this.getWelcomeEmailTemplate(name),
      });

      this.logger.log(`Welcome email sent to ${email}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to send welcome email to ${email}`, error.stack);
      return false;
    }
  }

  async sendOrderConfirmationEmail(email: string, orderData: any) {
    try {
      await this.transporter.sendMail({
        from: `"LeCas Fashion" <${this.configService.get('EMAIL_USER')}>`,
        to: email,
        subject: `Xác nhận đơn hàng #${orderData.id} - LeCas Fashion`,
        html: this.getOrderConfirmationTemplate(orderData),
      });

      this.logger.log(`Order confirmation email sent to ${email}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to send order confirmation email to ${email}`, error.stack);
      return false;
    }
  }

  // ==================== EMAIL TEMPLATES ====================

  private getActivationEmailTemplate(name: string, link: string): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #000; color: #fff; padding: 20px; text-align: center; }
          .content { padding: 30px; background: #f9f9f9; }
          .button { display: inline-block; padding: 12px 30px; background: #000; color: #fff !important; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>LeCas Fashion</h1>
          </div>
          <div class="content">
            <h2>Xin chào ${name},</h2>
            <p>Cảm ơn bạn đã đăng ký tài khoản tại LeCas Fashion!</p>
            <p>Vui lòng kích hoạt tài khoản của bạn bằng cách click vào nút bên dưới:</p>
            <div style="text-align: center;">
              <a href="${link}" class="button">Kích hoạt tài khoản</a>
            </div>
            <p>Hoặc copy link sau vào trình duyệt:</p>
            <p style="word-break: break-all; color: #666;">${link}</p>
            <p><strong>Lưu ý:</strong> Link này sẽ hết hạn sau 24 giờ.</p>
            <p>Sau khi kích hoạt, bạn sẽ tự động đăng nhập và có thể sử dụng tài khoản.</p>
            <p>Nếu bạn không đăng ký tài khoản này, vui lòng bỏ qua email này.</p>
          </div>
          <div class="footer">
            <p>&copy; 2024 LeCas Fashion. All rights reserved.</p>
            <p>Email: support@lecas.com | Hotline: 1900 1009</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  private getPasswordResetEmailTemplate(name: string, link: string): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #000; color: #fff; padding: 20px; text-align: center; }
          .content { padding: 30px; background: #f9f9f9; }
          .button { display: inline-block; padding: 12px 30px; background: #000; color: #fff !important; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
          .warning { background: #fff3cd; border-left: 4px solid #ffc107; padding: 10px; margin: 15px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>LeCas Fashion</h1>
          </div>
          <div class="content">
            <h2>Xin chào ${name},</h2>
            <p>Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản của bạn.</p>
            <div style="text-align: center;">
              <a href="${link}" class="button">Đặt lại mật khẩu</a>
            </div>
            <p>Hoặc copy link sau vào trình duyệt:</p>
            <p style="word-break: break-all; color: #666;">${link}</p>
            <div class="warning">
              <strong>⚠️ Lưu ý bảo mật:</strong>
              <ul>
                <li>Link này chỉ có hiệu lực trong 1 giờ</li>
                <li>Không chia sẻ link này với bất kỳ ai</li>
                <li>Nếu không phải bạn yêu cầu, vui lòng bỏ qua email này</li>
              </ul>
            </div>
          </div>
          <div class="footer">
            <p>&copy; 2024 LeCas Fashion. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  private getWelcomeEmailTemplate(name: string): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #000; color: #fff; padding: 20px; text-align: center; }
          .content { padding: 30px; background: #f9f9f9; }
          .button { display: inline-block; padding: 12px 30px; background: #000; color: #fff !important; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎉 Chào mừng đến với LeCas Fashion!</h1>
          </div>
          <div class="content">
            <h2>Xin chào ${name},</h2>
            <p>Email của bạn đã được xác thực thành công!</p>
            <p>Bạn đã chính thức trở thành thành viên của LeCas Fashion - Thời trang nam chất lượng cao.</p>
            <h3>🎁 Ưu đãi đặc biệt cho thành viên mới:</h3>
            <ul>
              <li>Giảm 10% cho đơn hàng đầu tiên</li>
              <li>Miễn phí vận chuyển cho đơn hàng trên 500.000đ</li>
              <li>Tích điểm và nhận quà tặng hấp dẫn</li>
            </ul>
            <div style="text-align: center;">
              <a href="${this.configService.get('FRONTEND_URL')}/products" class="button">Khám phá ngay</a>
            </div>
          </div>
          <div class="footer">
            <p>&copy; 2024 LeCas Fashion. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  private getOrderConfirmationTemplate(orderData: any): string {
    const itemsHtml = orderData.items
      .map(
        (item: any) => `
        <tr>
          <td style="padding: 10px; border-bottom: 1px solid #ddd;">${item.product_name}</td>
          <td style="padding: 10px; border-bottom: 1px solid #ddd;">${item.size} / ${item.color}</td>
          <td style="padding: 10px; border-bottom: 1px solid #ddd; text-align: center;">${item.quantity}</td>
          <td style="padding: 10px; border-bottom: 1px solid #ddd; text-align: right;">${item.price.toLocaleString()}đ</td>
        </tr>
      `,
      )
      .join('');

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #000; color: #fff; padding: 20px; text-align: center; }
          .content { padding: 30px; background: #f9f9f9; }
          table { width: 100%; border-collapse: collapse; margin: 20px 0; }
          .total { font-size: 18px; font-weight: bold; text-align: right; padding: 15px; background: #f0f0f0; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>✅ Đơn hàng đã được xác nhận</h1>
          </div>
          <div class="content">
            <p>Cảm ơn bạn đã đặt hàng tại LeCas Fashion!</p>
            <p><strong>Mã đơn hàng:</strong> #${orderData.id}</p>
            <p><strong>Ngày đặt:</strong> ${new Date(orderData.order_date).toLocaleDateString('vi-VN')}</p>
            <h3>Chi tiết đơn hàng:</h3>
            <table>
              <thead>
                <tr style="background: #f0f0f0;">
                  <th style="padding: 10px; text-align: left;">Sản phẩm</th>
                  <th style="padding: 10px; text-align: left;">Phân loại</th>
                  <th style="padding: 10px; text-align: center;">SL</th>
                  <th style="padding: 10px; text-align: right;">Giá</th>
                </tr>
              </thead>
              <tbody>
                ${itemsHtml}
              </tbody>
            </table>
            <div class="total">
              Tổng cộng: ${orderData.total.toLocaleString()}đ
            </div>
            <h3>Địa chỉ giao hàng:</h3>
            <p>
              ${orderData.shipping_name}<br/>
              ${orderData.shipping_phone}<br/>
              ${orderData.shipping_address}, ${orderData.shipping_city}<br/>
              ${orderData.shipping_postal_code}
            </p>
            <p>Chúng tôi sẽ thông báo cho bạn khi đơn hàng được giao.</p>
          </div>
          <div class="footer">
            <p>&copy; 2024 LeCas Fashion. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  // ==================== GENERIC SEND MAIL METHOD ====================
  async sendMail(options: {
    to: string;
    subject: string;
    template?: string;
    context?: any;
    html?: string;
  }) {
    try {
      let htmlContent = options.html || '';

      // If template is specified, use it
      if (options.template && options.context) {
        switch (options.template) {
          case 'ticket-reply':
            htmlContent = this.getTicketReplyTemplate(options.context);
            break;
          case 'order-status-update':
            htmlContent = this.getOrderStatusUpdateTemplate(options.context);
            break;
          default:
            htmlContent = options.html || '';
        }
      }

      await this.transporter.sendMail({
        from: `"LeCas Fashion" <${this.configService.get('EMAIL_USER')}>`,
        to: options.to,
        subject: options.subject,
        html: htmlContent,
      });

      this.logger.log(`Email sent successfully to ${options.to}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to send email to ${options.to}:`, error.message);
      return false;
    }
  }

  private getTicketReplyTemplate(context: any): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #000; color: #fff; padding: 20px; text-align: center; }
          .content { padding: 30px; background: #f9f9f9; }
          .reply-box { background: #fff; border-left: 4px solid #000; padding: 15px; margin: 20px 0; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>LeCas Fashion Support</h1>
          </div>
          <div class="content">
            <h2>Ticket #${context.ticketCode}</h2>
            <p><strong>Tiêu đề:</strong> ${context.subject}</p>
            <div class="reply-box">
              <h3>Phản hồi từ đội ngũ hỗ trợ:</h3>
              <p>${context.replyBody}</p>
            </div>
            <p>Nếu bạn có thắc mắc gì thêm, vui lòng trả lời email này.</p>
          </div>
          <div class="footer">
            <p>&copy; 2024 LeCas Fashion. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  private getOrderStatusUpdateTemplate(context: any): string {
    const statusColors = {
      Pending: '#FFA500',
      Confirmed: '#4880FF',
      Processing: '#1E90FF',
      Shipped: '#32CD32',
      Delivered: '#008000',
      Cancelled: '#DC143C',
    };

    const color = statusColors[context.newStatus] || '#000';

    // Build items HTML
    const itemsHtml = context.items?.map((item: any) => `
      <tr>
        <td style="padding: 12px; border-bottom: 1px solid #eee;">
          <div style="display: flex; align-items: center; gap: 12px;">
            ${item.image ? `<img src="${item.image}" alt="${item.name}" style="width: 60px; height: 60px; object-fit: cover; border-radius: 8px;" />` : ''}
            <div>
              <div style="font-weight: 600; margin-bottom: 4px;">${item.name}</div>
              <div style="font-size: 13px; color: #666;">Size: ${item.size} | Màu: ${item.color}</div>
            </div>
          </div>
        </td>
        <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: center; font-weight: 600;">x${item.quantity}</td>
        <td style="padding: 12px; border-bottom: 1px solid #eee; text-align: right; font-weight: 600;">${item.price.toLocaleString('vi-VN')}đ</td>
      </tr>
    `).join('') || '<tr><td colspan="3" style="padding: 12px; text-align: center; color: #999;">Không có sản phẩm</td></tr>';

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
          .container { max-width: 600px; margin: 0 auto; background: #fff; }
          .header { background: #000; color: #fff; padding: 30px 20px; text-align: center; }
          .header h1 { margin: 0; font-size: 28px; }
          .content { padding: 30px 20px; }
          .status-section { text-align: center; padding: 20px; background: #f8f9fa; border-radius: 8px; margin: 20px 0; }
          .status-badge { display: inline-block; padding: 12px 24px; background: ${color}; color: #fff; border-radius: 6px; font-weight: bold; font-size: 16px; text-transform: uppercase; }
          .info-box { background: #f8f9fa; padding: 15px; border-radius: 8px; margin: 15px 0; }
          .info-row { display: flex; justify-content: space-between; margin: 8px 0; }
          .info-label { color: #666; font-size: 14px; }
          .info-value { font-weight: 600; font-size: 14px; }
          table { width: 100%; border-collapse: collapse; margin: 20px 0; }
          .total-section { background: #f8f9fa; padding: 15px; border-radius: 8px; margin-top: 15px; }
          .total-row { display: flex; justify-content: space-between; margin: 8px 0; font-size: 14px; }
          .total-row.final { font-size: 18px; font-weight: bold; color: #000; border-top: 2px solid #ddd; padding-top: 12px; margin-top: 12px; }
          .tracking-box { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; border-radius: 4px; margin: 20px 0; }
          .note-box { background: #d1ecf1; border-left: 4px solid #0c5460; padding: 15px; border-radius: 4px; margin: 20px 0; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; border-top: 1px solid #eee; }
          .footer a { color: #4880FF; text-decoration: none; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>LeCas Fashion</h1>
          </div>
          
          <div class="content">
            <h2 style="margin-top: 0;">Cập nhật trạng thái đơn hàng</h2>
            
            <p>Xin chào <strong>${context.customerName}</strong>,</p>
            <p>Đơn hàng <strong>#${context.orderId}</strong> của bạn <strong>${context.statusText}</strong>.</p>
            
            <div class="status-section">
              <div style="color: #666; margin-bottom: 10px; font-size: 14px;">Trạng thái hiện tại</div>
              <span class="status-badge">${context.statusLabel}</span>
            </div>

            ${context.trackingNumber ? `
            <div class="tracking-box">
              <strong>📦 Mã vận đơn:</strong> ${context.trackingNumber}<br/>
              <strong>🚚 Đơn vị vận chuyển:</strong> ${context.carrierName}
            </div>
            ` : ''}

            ${context.note ? `
            <div class="note-box">
              <strong>📝 Ghi chú:</strong> ${context.note}
            </div>
            ` : ''}

            <h3 style="margin-top: 30px; margin-bottom: 15px;">Chi tiết đơn hàng</h3>
            <table>
              <thead>
                <tr style="background: #f0f0f0;">
                  <th style="padding: 12px; text-align: left; font-weight: 600;">Sản phẩm</th>
                  <th style="padding: 12px; text-align: center; font-weight: 600; width: 80px;">Số lượng</th>
                  <th style="padding: 12px; text-align: right; font-weight: 600; width: 120px;">Giá</th>
                </tr>
              </thead>
              <tbody>
                ${itemsHtml}
              </tbody>
            </table>

            <div class="total-section">
              <div class="total-row">
                <span>Tạm tính:</span>
                <span>${(context.subtotal || 0).toLocaleString('vi-VN')}đ</span>
              </div>
              <div class="total-row">
                <span>Phí vận chuyển:</span>
                <span>${(context.shippingFee || 0).toLocaleString('vi-VN')}đ</span>
              </div>
              <div class="total-row final">
                <span>Tổng cộng:</span>
                <span style="color: #4880FF;">${(context.totalAmount || 0).toLocaleString('vi-VN')}đ</span>
              </div>
            </div>

            <div class="info-box" style="margin-top: 20px;">
              <h4 style="margin-top: 0; margin-bottom: 10px;">📍 Địa chỉ giao hàng</h4>
              <div>${context.shippingAddress}</div>
              <div style="margin-top: 5px; color: #666;">SĐT: ${context.shippingPhone}</div>
            </div>

            <p style="margin-top: 30px; color: #666; font-size: 14px;">
              Cảm ơn bạn đã mua sắm tại LeCas Fashion! Nếu có bất kỳ thắc mắc nào, 
              vui lòng liên hệ với chúng tôi qua hotline hoặc email.
            </p>
          </div>

          <div class="footer">
            <p style="margin: 5px 0;"><strong>LeCas Fashion</strong> - Thời trang nam chất lượng cao</p>
            <p style="margin: 5px 0;">📧 Email: <a href="mailto:support@lecas.com">support@lecas.com</a> | 📞 Hotline: 1900 1009</p>
            <p style="margin: 5px 0;">&copy; 2024 LeCas Fashion. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }
}
