import { IsNotEmpty, IsString, IsBoolean, IsOptional, IsIn, IsNumber } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateAddressDto {
  @ApiProperty({
    example: 'Hà Nội',
    description: 'Tỉnh/Thành phố',
    required: false,
  })
  @IsOptional()
  @IsString()
  province?: string;

  @ApiProperty({
    example: 'Quận Ba Đình',
    description: 'Quận/Huyện',
    required: false,
  })
  @IsOptional()
  @IsString()
  district?: string;

  @ApiProperty({
    example: 'Phường Ngọc Hà',
    description: 'Xã/Phường',
    required: false,
  })
  @IsOptional()
  @IsString()
  ward?: string;

  @ApiProperty({
    example: '123 Đường Hoàng Diệu',
    description: 'Địa chỉ chi tiết (số nhà, đường)',
  })
  @IsNotEmpty()
  @IsString()
  street_address: string;

  @ApiProperty({
    example: '0901234567',
    description: 'Số điện thoại liên hệ',
  })
  @IsNotEmpty()
  @IsString()
  phone_number: string;

  @ApiProperty({
    example: 21.0285,
    description: 'Vĩ độ (GPS)',
    required: false,
  })
  @IsOptional()
  @IsNumber()
  latitude?: number;

  @ApiProperty({
    example: 105.8542,
    description: 'Kinh độ (GPS)',
    required: false,
  })
  @IsOptional()
  @IsNumber()
  longitude?: number;

  @ApiProperty({
    example: 'manual',
    description: 'Nguồn địa chỉ: manual (nhập tay) hoặc gps (từ tọa độ)',
    enum: ['manual', 'gps'],
    required: false,
    default: 'manual',
  })
  @IsOptional()
  @IsString()
  @IsIn(['manual', 'gps'])
  address_source?: string;

  @ApiProperty({
    example: 'Home',
    description: 'Loại địa chỉ: Home, Office, Other',
    enum: ['Home', 'Office', 'Other'],
    required: false,
  })
  @IsOptional()
  @IsString()
  @IsIn(['Home', 'Office', 'Other'])
  address_type?: string;

  @ApiProperty({
    example: false,
    description: 'Đặt làm địa chỉ mặc định',
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  is_default?: boolean;
}
