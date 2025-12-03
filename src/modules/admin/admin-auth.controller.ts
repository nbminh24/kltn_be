import { Controller, Post, Get, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AdminAuthService } from './admin-auth.service';
import { AdminLoginDto } from './dto/admin-login.dto';
import { CreateAdminDto } from './dto/create-admin.dto';
import { ResetAdminPasswordDto } from './dto/reset-admin-password.dto';
import { PublicResetPasswordDto } from './dto/public-reset-password.dto';
import { Public } from '../../common/decorators/public.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AdminGuard } from '../../common/guards/admin.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('🔐 Auth - Admin')
@Controller('api/v1/admin/auth')
export class AdminAuthController {
  constructor(private readonly adminAuthService: AdminAuthService) { }

  @Post('login')
  @Public()
  @ApiOperation({
    summary: 'Đăng nhập Admin',
    description: 'Admin đăng nhập bằng email/password và nhận Access Token (8 giờ). Không có Refresh Token.',
  })
  @ApiResponse({
    status: 200,
    description: 'Đăng nhập thành công',
    schema: {
      example: {
        message: 'Admin login successful.',
        access_token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        admin: {
          id: 1,
          name: 'Super Admin',
          email: 'admin@shop.com',
          role: 'super_admin',
        },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Thông tin đăng nhập không chính xác',
  })
  login(@Body() loginDto: AdminLoginDto) {
    return this.adminAuthService.login(loginDto);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Lấy thông tin admin hiện tại',
    description: 'Lấy profile của admin đang đăng nhập',
  })
  @ApiResponse({
    status: 200,
    description: 'Thông tin admin',
    schema: {
      example: {
        id: 1,
        name: 'Admin User',
        email: 'admin@example.com',
        role: 'admin',
        created_at: '2024-01-01T00:00:00Z',
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Chưa đăng nhập' })
  getProfile(@CurrentUser() user: any) {
    return this.adminAuthService.getProfile(user.sub);
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Đăng xuất admin',
    description: 'Admin logout. Client should clear access token.',
  })
  @ApiResponse({
    status: 200,
    description: 'Logout thành công',
    schema: {
      example: {
        message: 'Admin logout successful. Please clear access token on client.',
      },
    },
  })
  logout() {
    return this.adminAuthService.logout();
  }

  @Post('create')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Tạo admin mới',
    description: 'Tạo tài khoản admin mới. Chỉ admin hiện tại có thể tạo admin mới.',
  })
  @ApiResponse({
    status: 201,
    description: 'Tạo admin thành công',
    schema: {
      example: {
        message: 'Tạo admin thành công',
        admin: {
          id: 2,
          name: 'Admin User',
          email: 'admin@shop.com',
          role: 'admin',
        },
      },
    },
  })
  @ApiResponse({
    status: 409,
    description: 'Email đã được sử dụng',
  })
  @ApiResponse({
    status: 401,
    description: 'Chưa đăng nhập hoặc không có quyền',
  })
  createAdmin(@Body() createAdminDto: CreateAdminDto) {
    return this.adminAuthService.createAdmin(createAdminDto);
  }

  @Post('reset-password')
  @UseGuards(JwtAuthGuard, AdminGuard)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Reset password admin (Cần auth)',
    description: 'Admin đã login có thể reset password cho admin khác (hoặc chính mình). Dùng khi quên password.',
  })
  @ApiResponse({
    status: 200,
    description: 'Reset password thành công',
    schema: {
      example: {
        message: 'Reset password thành công',
        admin: {
          id: 1,
          email: 'admin@shop.com',
          name: 'Admin User',
        },
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Không tìm thấy admin với email này',
  })
  @ApiResponse({
    status: 401,
    description: 'Chưa đăng nhập hoặc không có quyền',
  })
  resetPassword(@Body() resetDto: ResetAdminPasswordDto) {
    return this.adminAuthService.resetAdminPassword(resetDto);
  }

  @Post('public-reset-password')
  @Public()
  @ApiOperation({
    summary: 'Reset password admin (Public - Không cần auth)',
    description: 'Reset password admin KHÔNG cần đăng nhập. Dành cho backoffice. Có thể yêu cầu secret code tùy cấu hình.',
  })
  @ApiResponse({
    status: 200,
    description: 'Reset password thành công',
    schema: {
      example: {
        message: 'Reset password thành công',
        admin: {
          id: 1,
          email: 'admin@shop.com',
          name: 'Admin User',
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Secret code không đúng',
  })
  @ApiResponse({
    status: 404,
    description: 'Không tìm thấy admin với email này',
  })
  publicResetPassword(@Body() resetDto: PublicResetPasswordDto) {
    return this.adminAuthService.publicResetPassword(resetDto);
  }
}
