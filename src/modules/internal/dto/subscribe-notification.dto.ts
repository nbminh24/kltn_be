import { IsString, IsNumber, IsOptional, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SubscribeNotificationDto {
  @ApiProperty({
    description: 'ID sản phẩm cần theo dõi',
    example: 123,
  })
  @IsNumber()
  product_id: number;

  @ApiProperty({
    description: 'ID user đăng ký',
    example: 456,
  })
  @IsNumber()
  user_id: number;

  @ApiProperty({
    description: 'Size cần theo dõi (optional)',
    example: 'M',
    required: false,
  })
  @IsOptional()
  @IsString()
  size?: string;

  @ApiProperty({
    description: 'Giá mong muốn (VNĐ) - sẽ báo khi giá thấp hơn hoặc bằng',
    example: 500000,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  price_condition?: number;
}
