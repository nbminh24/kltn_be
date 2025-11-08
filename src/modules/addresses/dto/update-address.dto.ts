import { IsString, IsBoolean, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateAddressDto {
  @ApiProperty({ description: 'Tên người nhận', example: 'Nguyễn Văn A', required: false })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({ description: 'Địa chỉ', example: '123 Nguyễn Huệ', required: false })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiProperty({ description: 'Thành phố', example: 'Hồ Chí Minh', required: false })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiProperty({ description: 'Quận/Huyện', example: 'Quận 1', required: false })
  @IsOptional()
  @IsString()
  state?: string;

  @ApiProperty({ description: 'Mã bưu điện', example: '700000', required: false })
  @IsOptional()
  @IsString()
  postal_code?: string;

  @ApiProperty({ description: 'Số điện thoại', example: '0909123456', required: false })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({ description: 'Đặt làm địa chỉ mặc định', example: false, required: false })
  @IsOptional()
  @IsBoolean()
  is_default?: boolean;
}
