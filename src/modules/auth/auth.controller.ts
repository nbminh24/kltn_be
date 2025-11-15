import { Controller, Post, Body, UseGuards, Request, Get, Query, Res } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { Response } from 'express';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { ActivateDto } from './dto/activate.dto';
import { GoogleAuthDto } from './dto/google-auth.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { VerifyResetTokenDto } from './dto/verify-reset-token.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { Public } from '../../common/decorators/public.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@ApiTags('Auth')
@Controller('api/v1/auth')
@Public()
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @ApiOperation({ 
    summary: 'Đăng ký tài khoản bằng email/password',
    description: 'Tạo tài khoản mới với status=inactive. Gửi email kích hoạt cho user.'
  })
  @ApiResponse({ status: 201, description: 'Đăng ký thành công, vui lòng kiểm tra email' })
  @ApiResponse({ status: 409, description: 'Email đã tồn tại' })
  register(@Body() registerDto: RegisterDto) {
    return this.authService.register(registerDto);
  }

  @Get('activate')
  @ApiOperation({ 
    summary: 'Kích hoạt tài khoản (GET - click link trong email)',
    description: 'User click link trong email → Backend kích hoạt → Redirect về frontend với tokens'
  })
  @ApiResponse({ status: 302, description: 'Redirect về frontend với tokens' })
  @ApiResponse({ status: 401, description: 'Token không hợp lệ hoặc đã hết hạn' })
  async activateByLink(@Query('token') token: string, @Res() res) {
    try {
      const result = await this.authService.activate(token);
      
      // Redirect về frontend với tokens trong URL
      const frontendUrl = this.authService.getFrontendUrl();
      const redirectUrl = `${frontendUrl}/auth/success?access_token=${result.access_token}&refresh_token=${result.refresh_token}`;
      
      return res.redirect(redirectUrl);
    } catch (error) {
      // Nếu lỗi, redirect về trang lỗi
      const frontendUrl = this.authService.getFrontendUrl();
      return res.redirect(`${frontendUrl}/auth/error?message=${encodeURIComponent(error.message)}`);
    }
  }

  @Post('activate')
  @ApiOperation({ 
    summary: 'Kích hoạt tài khoản (POST - dùng cho API call)',
    description: 'Kích hoạt tài khoản khi user click link trong email. Tự động đăng nhập và trả về Access/Refresh Token.'
  })
  @ApiResponse({ status: 200, description: 'Kích hoạt thành công và tự động đăng nhập' })
  @ApiResponse({ status: 401, description: 'Token không hợp lệ hoặc đã hết hạn' })
  activate(@Body() activateDto: ActivateDto) {
    return this.authService.activate(activateDto.token);
  }

  @Post('login')
  @ApiOperation({ 
    summary: 'Đăng nhập bằng email/password',
    description: 'Đăng nhập và trả về Access Token (15 phút) và Refresh Token (30 ngày)'
  })
  @ApiResponse({ status: 200, description: 'Đăng nhập thành công' })
  @ApiResponse({ status: 401, description: 'Email/password không chính xác hoặc tài khoản chưa kích hoạt' })
  login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @Post('google')
  @ApiOperation({ 
    summary: 'Đăng nhập/Đăng ký bằng Google',
    description: 'Backend nhận auth_code từ Frontend, gọi Google API để lấy thông tin user. Tự động đăng ký nếu chưa có tài khoản.'
  })
  @ApiResponse({ status: 200, description: 'Đăng nhập Google thành công' })
  @ApiResponse({ status: 400, description: 'Auth code không hợp lệ' })
  googleLogin(@Body() googleAuthDto: GoogleAuthDto) {
    return this.authService.googleLogin(googleAuthDto.auth_code);
  }

  @Post('refresh')
  @ApiOperation({ 
    summary: 'Làm mới Access Token',
    description: 'API chạy ngầm để duy trì đăng nhập. Nhận refresh_token (30 ngày) và trả về access_token mới (15 phút).'
  })
  @ApiResponse({ status: 200, description: 'Refresh token thành công' })
  @ApiResponse({ status: 401, description: 'Refresh token không hợp lệ hoặc đã hết hạn' })
  refreshToken(@Body() refreshTokenDto: RefreshTokenDto) {
    return this.authService.refreshToken(refreshTokenDto.refresh_token);
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ 
    summary: 'Đăng xuất',
    description: 'Vô hiệu hóa refresh_token trong DB để không thể dùng lại.'
  })
  @ApiResponse({ status: 200, description: 'Đăng xuất thành công' })
  @ApiResponse({ status: 401, description: 'Chưa đăng nhập' })
  logout(@Request() req) {
    return this.authService.logout(req.user.sub);
  }

  @Post('forgot-password')
  @ApiOperation({ 
    summary: 'Gửi yêu cầu đặt lại mật khẩu',
    description: 'Gửi email chứa link đặt lại mật khẩu. Luôn trả về success để tránh email enumeration attack.'
  })
  @ApiResponse({ status: 200, description: 'Nếu email tồn tại, link đã được gửi' })
  forgotPassword(@Body() forgotPasswordDto: ForgotPasswordDto) {
    return this.authService.forgotPassword(forgotPasswordDto.email);
  }

  @Post('verify-reset-token')
  @ApiOperation({ 
    summary: 'Xác thực token đặt lại mật khẩu',
    description: 'API phụ trợ để Frontend kiểm tra token có hợp lệ không trước khi hiển thị form đặt mật khẩu mới.'
  })
  @ApiResponse({ status: 200, description: 'Kiểm tra token thành công' })
  verifyResetToken(@Body() verifyResetTokenDto: VerifyResetTokenDto) {
    return this.authService.verifyResetToken(verifyResetTokenDto.token);
  }

  @Post('reset-password')
  @ApiOperation({ 
    summary: 'Đặt mật khẩu mới',
    description: 'Hoàn tất việc đặt lại mật khẩu với token hợp lệ và mật khẩu mới.'
  })
  @ApiResponse({ status: 200, description: 'Đặt lại mật khẩu thành công' })
  @ApiResponse({ status: 401, description: 'Token không hợp lệ hoặc đã hết hạn' })
  resetPassword(@Body() resetPasswordDto: ResetPasswordDto) {
    return this.authService.resetPassword(resetPasswordDto.token, resetPasswordDto.newPassword);
  }
}
