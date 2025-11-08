import { IsString, IsBoolean, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateAddressDto {
  @ApiProperty({ description: 'Tên người nhận', example: 'Nguyễn Văn A' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Địa chỉ', example: '123 Nguyễn Huệ' })
  @IsString()
  address: string;

  @ApiProperty({ description: 'Thành phố', example: 'Hồ Chí Minh' })
  @IsString()
  city: string;

  @ApiProperty({ description: 'Quận/Huyện', example: 'Quận 1', required: false })
  @IsOptional()
  @IsString()
  state?: string;

  @ApiProperty({ description: 'Mã bưu điện', example: '700000' })
  @IsString()
  postal_code: string;

  @ApiProperty({ description: 'Số điện thoại', example: '0909123456' })
  @IsString()
  phone: string;

  @ApiProperty({ description: 'Đặt làm địa chỉ mặc định', example: false, required: false, default: false })
  @IsOptional()
  @IsBoolean()
  is_default?: boolean;
}
