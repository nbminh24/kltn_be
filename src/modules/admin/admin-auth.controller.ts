import { Controller, Post, Get, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { AdminAuthService } from './admin-auth.service';
import { AdminLoginDto } from './dto/admin-login.dto';
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
}
