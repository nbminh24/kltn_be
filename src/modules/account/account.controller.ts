import { Controller, Get, Put, Post, Delete, Body, Param, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { AccountService } from './account.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { CreateAddressDto } from './dto/create-address.dto';
import { UpdateAddressDto } from './dto/update-address.dto';

@ApiTags('Account')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('account')
export class AccountController {
  constructor(private readonly accountService: AccountService) {}

  // ==================== PROFILE ====================
  @Get('profile')
  @ApiOperation({ summary: 'Lấy thông tin tài khoản' })
  @ApiResponse({ status: 200, description: 'Thông tin profile' })
  getProfile(@CurrentUser() user: any) {
    return this.accountService.getProfile(user.userId);
  }

  @Put('profile')
  @ApiOperation({ summary: 'Cập nhật thông tin tài khoản' })
  @ApiResponse({ status: 200, description: 'Cập nhật thành công' })
  updateProfile(@CurrentUser() user: any, @Body() body: UpdateProfileDto) {
    return this.accountService.updateProfile(user.userId, body);
  }

  @Put('password')
  @ApiOperation({ summary: 'Đổi mật khẩu' })
  @ApiResponse({ status: 200, description: 'Đổi mật khẩu thành công' })
  @ApiResponse({ status: 401, description: 'Mật khẩu cũ không đúng' })
  changePassword(@CurrentUser() user: any, @Body() body: ChangePasswordDto) {
    return this.accountService.changePassword(user.userId, body);
  }

  // ==================== ADDRESSES ====================
  @Get('addresses')
  @ApiOperation({ summary: 'Danh sách địa chỉ giao hàng' })
  @ApiResponse({ status: 200, description: 'Danh sách địa chỉ' })
  getAddresses(@CurrentUser() user: any) {
    return this.accountService.getAddresses(user.userId);
  }

  @Post('addresses')
  @ApiOperation({ summary: 'Thêm địa chỉ giao hàng mới' })
  @ApiResponse({ status: 201, description: 'Thêm địa chỉ thành công' })
  createAddress(@CurrentUser() user: any, @Body() body: CreateAddressDto) {
    return this.accountService.createAddress(user.userId, body);
  }

  @Put('addresses/:id')
  @ApiOperation({ summary: 'Cập nhật địa chỉ giao hàng' })
  @ApiResponse({ status: 200, description: 'Cập nhật thành công' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy địa chỉ' })
  updateAddress(@CurrentUser() user: any, @Param('id') id: string, @Body() body: UpdateAddressDto) {
    return this.accountService.updateAddress(user.userId, id, body);
  }

  @Delete('addresses/:id')
  @ApiOperation({ summary: 'Xóa địa chỉ giao hàng' })
  @ApiResponse({ status: 200, description: 'Xóa thành công' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy địa chỉ' })
  deleteAddress(@CurrentUser() user: any, @Param('id') id: string) {
    return this.accountService.deleteAddress(user.userId, id);
  }
}
