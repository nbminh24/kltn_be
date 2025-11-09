import { IsNotEmpty, IsString, IsBoolean, IsOptional, IsIn } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateAddressDto {
  @ApiProperty({ 
    example: '123 Nguyễn Huệ, Phường Bến Nghé, Quận 1, TP. Hồ Chí Minh',
    description: 'Địa chỉ chi tiết đầy đủ'
  })
  @IsNotEmpty()
  @IsString()
  detailed_address: string;

  @ApiProperty({ 
    example: '0901234567',
    description: 'Số điện thoại liên hệ'
  })
  @IsNotEmpty()
  @IsString()
  phone_number: string;

  @ApiProperty({ 
    example: 'Home',
    description: 'Loại địa chỉ: Home, Office, Other',
    enum: ['Home', 'Office', 'Other'],
    required: false 
  })
  @IsOptional()
  @IsString()
  @IsIn(['Home', 'Office', 'Other'])
  address_type?: string;

  @ApiProperty({ 
    example: false, 
    description: 'Đặt làm địa chỉ mặc định',
    required: false 
  })
  @IsOptional()
  @IsBoolean()
  is_default?: boolean;
}
