import { Injectable, UnauthorizedException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { Admin } from '../../entities/admin.entity';
import { AdminLoginDto } from './dto/admin-login.dto';

@Injectable()
export class AdminAuthService {
  constructor(
    @InjectRepository(Admin)
    private adminRepository: Repository<Admin>,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) {}

  async login(loginDto: AdminLoginDto) {
    // Tìm admin bằng email
    const admin = await this.adminRepository.findOne({
      where: { email: loginDto.email },
    });

    if (!admin) {
      throw new UnauthorizedException('Thông tin đăng nhập không chính xác');
    }

    // Verify password
    const isPasswordValid = await bcrypt.compare(
      loginDto.password,
      admin.password_hash,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException('Thông tin đăng nhập không chính xác');
    }

    // Generate Access Token (8 hours, no refresh token)
    const payload = {
      sub: admin.id,
      email: admin.email,
      role: admin.role,
      type: 'admin',
    };

    const accessToken = this.jwtService.sign(payload, {
      secret: this.configService.get('JWT_SECRET'),
      expiresIn: '8h',
    });

    return {
      message: 'Admin login successful.',
      access_token: accessToken,
      admin: {
        id: admin.id,
        name: admin.name,
        email: admin.email,
        role: admin.role,
      },
    };
  }

  async validateAdmin(adminId: number) {
    const admin = await this.adminRepository.findOne({
      where: { id: adminId },
    });

    if (!admin) {
      throw new UnauthorizedException('Admin không tồn tại');
    }

    return {
      id: admin.id,
      email: admin.email,
      role: admin.role,
    };
  }
}
