import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { google } from 'googleapis';
import { Customer } from '../../entities/customer.entity';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { EmailService } from '../email/email.service';

@Injectable()
export class AuthService {
  private oauth2Client;

  constructor(
    @InjectRepository(Customer)
    private customerRepository: Repository<Customer>,
    private jwtService: JwtService,
    private emailService: EmailService,
    private configService: ConfigService,
  ) {
    // Initialize Google OAuth2 Client
    this.oauth2Client = new google.auth.OAuth2(
      this.configService.get('GOOGLE_CLIENT_ID'),
      this.configService.get('GOOGLE_CLIENT_SECRET'),
      'postmessage', // For authorization code flow
    );
  }

  async register(registerDto: RegisterDto) {
    // Check if email exists
    const existingCustomer = await this.customerRepository.findOne({
      where: { email: registerDto.email, deleted_at: null },
    });

    if (existingCustomer) {
      throw new ConflictException('Email đã tồn tại');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(registerDto.password, 10);

    // Generate activation token (JWT with 24h expiry)
    const activationToken = this.jwtService.sign(
      { email: registerDto.email, purpose: 'activation' },
      { expiresIn: '24h' },
    );

    // Create customer with status='inactive'
    const customer = this.customerRepository.create({
      name: registerDto.name,
      email: registerDto.email,
      password_hash: hashedPassword,
      status: 'inactive',
    });

    await this.customerRepository.save(customer);

    // Send activation email
    await this.emailService.sendActivationEmail(customer.email, customer.name, activationToken);

    return {
      message: 'Đăng ký thành công. Vui lòng kiểm tra email để kích hoạt tài khoản.',
    };
  }

  getFrontendUrl(): string {
    return this.configService.get('FRONTEND_URL', 'http://localhost:3000');
  }

  async activate(token: string) {
    try {
      // Verify activation token
      const payload = this.jwtService.verify(token);

      if (payload.purpose !== 'activation') {
        throw new UnauthorizedException('Token không hợp lệ');
      }

      // Find customer by email
      const customer = await this.customerRepository
        .createQueryBuilder('customer')
        .addSelect('customer.password_hash')
        .where('customer.email = :email', { email: payload.email })
        .getOne();

      if (!customer) {
        throw new NotFoundException('Không tìm thấy tài khoản');
      }

      if (customer.status === 'active') {
        throw new BadRequestException('Tài khoản đã được kích hoạt');
      }

      // Activate customer
      customer.status = 'active';

      // Generate tokens
      const { access_token, refresh_token } = await this.generateTokens(customer);

      // Save refresh token
      customer.refresh_token = refresh_token;
      customer.refresh_token_expires = this.getRefreshTokenExpiry();
      await this.customerRepository.save(customer);

      return {
        message: 'Kích hoạt tài khoản thành công',
        customer: {
          id: customer.id,
          name: customer.name,
          email: customer.email,
          status: customer.status,
        },
        access_token,
        refresh_token,
      };
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        throw new UnauthorizedException('Token đã hết hạn');
      }
      throw error;
    }
  }

  async login(loginDto: LoginDto) {
    // Find customer with password
    const customer = await this.customerRepository
      .createQueryBuilder('customer')
      .addSelect('customer.password_hash')
      .where('customer.email = :email', { email: loginDto.email })
      .getOne();

    if (!customer) {
      throw new UnauthorizedException('Email hoặc mật khẩu không chính xác');
    }

    // Check password
    const isPasswordValid = await bcrypt.compare(loginDto.password, customer.password_hash);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Email hoặc mật khẩu không chính xác');
    }

    // Check if account is active
    if (customer.status !== 'active') {
      throw new UnauthorizedException('Tài khoản chưa được kích hoạt. Vui lòng kiểm tra email.');
    }

    // Generate tokens
    const { access_token, refresh_token } = await this.generateTokens(customer);

    // Save refresh token
    customer.refresh_token = refresh_token;
    customer.refresh_token_expires = this.getRefreshTokenExpiry();
    await this.customerRepository.save(customer);

    return {
      message: 'Đăng nhập thành công',
      customer: {
        id: customer.id,
        name: customer.name,
        email: customer.email,
        status: customer.status,
      },
      access_token,
      refresh_token,
    };
  }

  async googleLogin(authCode: string) {
    try {
      // Exchange auth code for tokens
      const { tokens } = await this.oauth2Client.getToken(authCode);
      this.oauth2Client.setCredentials(tokens);

      // Get user info from Google
      const oauth2 = google.oauth2({ version: 'v2', auth: this.oauth2Client });
      const { data } = await oauth2.userinfo.get();

      if (!data.email) {
        throw new BadRequestException('Không thể lấy thông tin email từ Google');
      }

      // Check if customer exists
      let customer = await this.customerRepository
        .createQueryBuilder('customer')
        .addSelect('customer.password_hash')
        .where('customer.email = :email', { email: data.email })
        .getOne();

      if (customer) {
        // Existing customer - login
        if (customer.status !== 'active') {
          // Auto-activate if Google login
          customer.status = 'active';
        }
      } else {
        // New customer - register
        customer = this.customerRepository.create({
          name: data.name || data.email.split('@')[0],
          email: data.email,
          password_hash: null, // No password for Google accounts
          status: 'active', // Auto-activate for Google accounts
        });
        await this.customerRepository.save(customer);
      }

      // Generate tokens
      const { access_token, refresh_token } = await this.generateTokens(customer);

      // Save refresh token
      customer.refresh_token = refresh_token;
      customer.refresh_token_expires = this.getRefreshTokenExpiry();
      await this.customerRepository.save(customer);

      return {
        message: 'Đăng nhập Google thành công',
        customer: {
          id: customer.id,
          name: customer.name,
          email: customer.email,
          status: customer.status,
        },
        access_token,
        refresh_token,
      };
    } catch (error) {
      throw new BadRequestException('Google login thất bại: ' + error.message);
    }
  }

  async refreshToken(refreshToken: string) {
    try {
      // Verify refresh token
      const payload = this.jwtService.verify(refreshToken);

      if (payload.type !== 'refresh') {
        throw new UnauthorizedException('Token không hợp lệ');
      }

      // Find customer with refresh token
      const customer = await this.customerRepository
        .createQueryBuilder('customer')
        .addSelect('customer.refresh_token')
        .addSelect('customer.refresh_token_expires')
        .where('customer.id = :id', { id: payload.sub })
        .getOne();

      if (!customer) {
        throw new UnauthorizedException('Không tìm thấy tài khoản');
      }

      // Check if refresh token matches and not expired
      if (customer.refresh_token !== refreshToken) {
        throw new UnauthorizedException('Refresh token không hợp lệ');
      }

      if (customer.refresh_token_expires < new Date()) {
        throw new UnauthorizedException('Refresh token đã hết hạn');
      }

      // Generate new access token
      const access_token = this.jwtService.sign(
        { email: customer.email, sub: customer.id },
        { expiresIn: '15m' },
      );

      return {
        access_token,
      };
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        throw new UnauthorizedException('Refresh token đã hết hạn');
      }
      throw error;
    }
  }

  async logout(customerId: number) {
    const customer = await this.customerRepository.findOne({
      where: { id: customerId, deleted_at: null },
    });

    if (!customer) {
      throw new NotFoundException('Không tìm thấy tài khoản');
    }

    // Clear refresh token
    customer.refresh_token = null;
    customer.refresh_token_expires = null;
    await this.customerRepository.save(customer);

    return {
      message: 'Đăng xuất thành công',
    };
  }

  async forgotPassword(email: string) {
    const customer = await this.customerRepository.findOne({ where: { email, deleted_at: null } });

    // Security: Always return success message even if email doesn't exist
    // to prevent email enumeration attacks
    if (!customer) {
      return {
        message: 'Nếu email của bạn tồn tại, một link đặt lại mật khẩu đã được gửi.',
      };
    }

    // Generate reset token (15-30 minutes expiry)
    const resetToken = this.jwtService.sign(
      { email: customer.email, purpose: 'reset' },
      { expiresIn: '30m' },
    );

    // Send reset email
    await this.emailService.sendPasswordResetEmail(customer.email, customer.name, resetToken);

    return {
      message: 'Nếu email của bạn tồn tại, một link đặt lại mật khẩu đã được gửi.',
    };
  }

  async verifyResetToken(token: string) {
    try {
      const payload = this.jwtService.verify(token);

      if (payload.purpose !== 'reset') {
        return {
          valid: false,
          message: 'Token không hợp lệ hoặc đã hết hạn.',
        };
      }

      return {
        valid: true,
        message: 'Token hợp lệ.',
      };
    } catch (error) {
      return {
        valid: false,
        message: 'Token không hợp lệ hoặc đã hết hạn.',
      };
    }
  }

  async resetPassword(token: string, newPassword: string) {
    try {
      // Verify the reset token
      const payload = this.jwtService.verify(token);

      if (payload.purpose !== 'reset') {
        throw new UnauthorizedException('Token không hợp lệ');
      }

      // Find customer by email
      const customer = await this.customerRepository.findOne({
        where: { email: payload.email, deleted_at: null },
      });

      if (!customer) {
        throw new NotFoundException('Không tìm thấy tài khoản');
      }

      // CRITICAL: Hash the new password BEFORE saving
      const hashedPassword = await bcrypt.hash(newPassword, 10);

      // Use .update() method to ensure direct database update
      // This bypasses any potential entity lifecycle issues
      await this.customerRepository.update(
        { id: customer.id },
        {
          password_hash: hashedPassword,
          refresh_token: null, // Clear refresh token for security
          refresh_token_expires: null,
        },
      );

      return {
        message: 'Đặt lại mật khẩu thành công. Bạn có thể đăng nhập ngay.',
      };
    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        throw new UnauthorizedException('Token đã hết hạn');
      }
      if (error instanceof NotFoundException || error instanceof UnauthorizedException) {
        throw error;
      }
      throw new UnauthorizedException('Token không hợp lệ hoặc đã hết hạn');
    }
  }

  // Helper functions
  private async generateTokens(customer: Customer) {
    const payload = { email: customer.email, sub: customer.id };

    const access_token = this.jwtService.sign(payload, {
      expiresIn: '15m', // 15 minutes
    });

    const refresh_token = this.jwtService.sign(
      { ...payload, type: 'refresh' },
      {
        expiresIn: '30d', // 30 days
      },
    );

    return { access_token, refresh_token };
  }

  private getRefreshTokenExpiry(): Date {
    const expiry = new Date();
    expiry.setDate(expiry.getDate() + 30); // 30 days
    return expiry;
  }
}
