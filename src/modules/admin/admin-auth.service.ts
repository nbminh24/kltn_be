import { Injectable, UnauthorizedException, ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { Admin } from '../../entities/admin.entity';
import { AdminLoginDto } from './dto/admin-login.dto';
import { CreateAdminDto } from './dto/create-admin.dto';
import { ResetAdminPasswordDto } from './dto/reset-admin-password.dto';
import { PublicResetPasswordDto } from './dto/public-reset-password.dto';

@Injectable()
export class AdminAuthService {
  constructor(
    @InjectRepository(Admin)
    private adminRepository: Repository<Admin>,
    private jwtService: JwtService,
    private configService: ConfigService,
  ) { }

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

  async getProfile(adminId: number) {
    const admin = await this.adminRepository.findOne({
      where: { id: adminId },
      select: ['id', 'name', 'email', 'role'],
    });

    if (!admin) {
      throw new UnauthorizedException('Admin không tồn tại');
    }

    return {
      id: admin.id,
      name: admin.name,
      email: admin.email,
      role: admin.role,
    };
  }

  async logout() {
    // Admin logout: Token is stateless (8h JWT), client should clear token
    // No server-side invalidation needed
    return {
      message: 'Admin logout successful. Please clear access token on client.',
    };
  }

  async createAdmin(createAdminDto: CreateAdminDto) {
    // Kiểm tra email đã tồn tại
    const existingAdmin = await this.adminRepository.findOne({
      where: { email: createAdminDto.email },
    });

    if (existingAdmin) {
      throw new ConflictException('Email đã được sử dụng');
    }

    // Hash password
    const saltRounds = 10;
    const password_hash = await bcrypt.hash(createAdminDto.password, saltRounds);

    // Tạo admin mới
    const newAdmin = this.adminRepository.create({
      name: createAdminDto.name,
      email: createAdminDto.email,
      password_hash,
      role: createAdminDto.role || 'admin',
    });

    const savedAdmin = await this.adminRepository.save(newAdmin);

    // Trả về thông tin admin (không bao gồm password_hash)
    return {
      message: 'Tạo admin thành công',
      admin: {
        id: savedAdmin.id,
        name: savedAdmin.name,
        email: savedAdmin.email,
        role: savedAdmin.role,
      },
    };
  }

  async resetAdminPassword(resetDto: ResetAdminPasswordDto) {
    // Tìm admin theo email
    const admin = await this.adminRepository.findOne({
      where: { email: resetDto.email },
    });

    if (!admin) {
      throw new NotFoundException('Không tìm thấy admin với email này');
    }

    // Hash password mới
    const saltRounds = 10;
    const password_hash = await bcrypt.hash(resetDto.new_password, saltRounds);

    // Cập nhật password
    admin.password_hash = password_hash;
    await this.adminRepository.save(admin);

    return {
      message: 'Reset password thành công',
      admin: {
        id: admin.id,
        email: admin.email,
        name: admin.name,
      },
    };
  }

  async publicResetPassword(resetDto: PublicResetPasswordDto) {
    // Kiểm tra secret code (optional - có thể bỏ nếu muốn)
    const resetSecret = this.configService.get('ADMIN_RESET_SECRET');

    // Nếu có cấu hình secret thì kiểm tra, không có thì bỏ qua
    if (resetSecret && resetDto.secret_code !== resetSecret) {
      throw new BadRequestException('Secret code không đúng');
    }

    // Tìm admin theo email
    const admin = await this.adminRepository.findOne({
      where: { email: resetDto.email },
    });

    if (!admin) {
      throw new NotFoundException('Không tìm thấy admin với email này');
    }

    // Hash password mới
    const saltRounds = 10;
    const password_hash = await bcrypt.hash(resetDto.new_password, saltRounds);

    // Cập nhật password
    admin.password_hash = password_hash;
    await this.adminRepository.save(admin);

    return {
      message: 'Reset password thành công',
      admin: {
        id: admin.id,
        email: admin.email,
        name: admin.name,
      },
    };
  }
}
