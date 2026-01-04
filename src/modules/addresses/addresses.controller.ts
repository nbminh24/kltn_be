import { Controller, Get, Post, Put, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { AddressesService } from './addresses.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CreateAddressDto } from './dto/create-address.dto';
import { UpdateAddressDto } from './dto/update-address.dto';

@ApiTags('Addresses')
@ApiBearerAuth('JWT-auth')
@UseGuards(JwtAuthGuard)
@Controller('addresses')
export class AddressesController {
  constructor(private readonly addressesService: AddressesService) {}

  @Get()
  @ApiOperation({
    summary: 'Danh sách địa chỉ đã lưu',
    description: 'Lấy tất cả địa chỉ giao hàng của user. Sắp xếp theo địa chỉ mặc định trước.',
  })
  @ApiResponse({ status: 200, description: 'Danh sách địa chỉ' })
  findAll(@CurrentUser() user: any) {
    return this.addressesService.findAll(user.sub);
  }

  @Post()
  @ApiOperation({
    summary: 'Thêm địa chỉ giao hàng mới',
    description: 'Tạo địa chỉ giao hàng mới. Có thể đặt làm địa chỉ mặc định (is_default).',
  })
  @ApiResponse({ status: 201, description: 'Địa chỉ được tạo thành công' })
  create(@CurrentUser() user: any, @Body() body: CreateAddressDto) {
    return this.addressesService.create(user.sub, body);
  }

  @Put(':id')
  @ApiOperation({
    summary: 'Cập nhật địa chỉ',
    description: 'Sửa đổi thông tin địa chỉ hiện có hoặc đổi địa chỉ mặc định.',
  })
  @ApiResponse({ status: 200, description: 'Cập nhật thành công' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy địa chỉ' })
  update(@CurrentUser() user: any, @Param('id') id: string, @Body() body: UpdateAddressDto) {
    return this.addressesService.update(user.sub, parseInt(id), body);
  }

  @Delete(':id')
  @ApiOperation({
    summary: 'Xóa địa chỉ',
    description: 'Xóa một địa chỉ giao hàng khỏi sổ địa chỉ.',
  })
  @ApiResponse({ status: 200, description: 'Xóa thành công' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy địa chỉ' })
  delete(@CurrentUser() user: any, @Param('id') id: string) {
    return this.addressesService.delete(user.sub, parseInt(id));
  }
}
