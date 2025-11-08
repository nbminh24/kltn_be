import { IsString, IsNumber, IsOptional, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateOrderDto {
  @ApiProperty({ description: 'Mã giảm giá (nếu có)', example: 'SUMMER2024', required: false })
  @IsOptional()
  @IsString()
  promo_code?: string;

  @ApiProperty({ description: 'Giảm giá', example: 50000, default: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  discount?: number;

  @ApiProperty({ description: 'Phí vận chuyển', example: 30000, default: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  delivery_fee?: number;

  @ApiProperty({ description: 'Phương thức thanh toán', example: 'COD', enum: ['COD', 'Card', 'Banking'] })
  @IsString()
  payment_method: string;

  @ApiProperty({ description: 'Tên người nhận', example: 'Nguyễn Văn A' })
  @IsString()
  shipping_name: string;

  @ApiProperty({ description: 'Số điện thoại người nhận', example: '0909123456' })
  @IsString()
  shipping_phone: string;

  @ApiProperty({ description: 'Địa chỉ giao hàng', example: '123 Nguyễn Huệ' })
  @IsString()
  shipping_address: string;

  @ApiProperty({ description: 'Thành phố', example: 'Hồ Chí Minh' })
  @IsString()
  shipping_city: string;

  @ApiProperty({ description: 'Quận/Huyện', example: 'Quận 1', required: false })
  @IsOptional()
  @IsString()
  shipping_state?: string;

  @ApiProperty({ description: 'Mã bưu điện', example: '700000' })
  @IsString()
  shipping_postal_code: string;
}
