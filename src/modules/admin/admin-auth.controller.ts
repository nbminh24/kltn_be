import { Controller, Post, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AdminAuthService } from './admin-auth.service';
import { AdminLoginDto } from './dto/admin-login.dto';
import { Public } from '../../common/decorators/public.decorator';

@ApiTags('Admin Authentication')
@Controller('api/v1/admin/auth')
@Public()
export class AdminAuthController {
  constructor(private readonly adminAuthService: AdminAuthService) {}

  @Post('login')
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
}
