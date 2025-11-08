import { IsNotEmpty, IsString, IsBoolean, IsOptional, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateAddressDto {
  @ApiProperty({ example: 'Nhà riêng' })
  @IsNotEmpty()
  @IsString()
  @MaxLength(100)
  label: string;

  @ApiProperty({ example: 'Nguyễn Văn A' })
  @IsNotEmpty()
  @IsString()
  @MaxLength(255)
  recipient_name: string;

  @ApiProperty({ example: '0901234567' })
  @IsNotEmpty()
  @IsString()
  @MaxLength(20)
  recipient_phone: string;

  @ApiProperty({ example: '123 Nguyễn Huệ' })
  @IsNotEmpty()
  @IsString()
  @MaxLength(500)
  address_line: string;

  @ApiProperty({ example: 'Quận 1' })
  @IsNotEmpty()
  @IsString()
  @MaxLength(100)
  district: string;

  @ApiProperty({ example: 'TP. Hồ Chí Minh' })
  @IsNotEmpty()
  @IsString()
  @MaxLength(100)
  city: string;

  @ApiProperty({ example: '700000', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  postal_code?: string;

  @ApiProperty({ example: true, required: false })
  @IsOptional()
  @IsBoolean()
  is_default?: boolean;
}
