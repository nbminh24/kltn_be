import { IsString, IsNumber, IsOptional, IsIn, IsDateString, Min, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdatePromotionDto {
  @ApiProperty({
    description: 'Tên khuyến mãi',
    example: 'Updated Sale Name',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string;

  @ApiProperty({
    description: 'Loại khuyến mãi',
    example: 'voucher',
    enum: ['voucher', 'flash_sale'],
    required: false,
  })
  @IsOptional()
  @IsString()
  @IsIn(['voucher', 'flash_sale'])
  type?: string;

  @ApiProperty({
    description: 'Giá trị giảm giá',
    example: 25,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Min(0.01)
  discount_value?: number;

  @ApiProperty({
    description: 'Kiểu giảm giá',
    example: 'percentage',
    enum: ['percentage', 'fixed_amount'],
    required: false,
  })
  @IsOptional()
  @IsString()
  @IsIn(['percentage', 'fixed_amount'])
  discount_type?: string;

  @ApiProperty({
    description: 'Giới hạn số lượng',
    example: 200,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  number_limited?: number;

  @ApiProperty({
    description: 'Ngày bắt đầu (YYYY-MM-DD)',
    example: '2026-01-15',
    required: false,
  })
  @IsOptional()
  @IsDateString()
  start_date?: string;

  @ApiProperty({
    description: 'Ngày kết thúc (YYYY-MM-DD)',
    example: '2026-01-30',
    required: false,
  })
  @IsOptional()
  @IsDateString()
  end_date?: string;

  @ApiProperty({
    description: 'Trạng thái (admin có thể manually thay đổi)',
    example: 'active',
    enum: ['scheduled', 'active', 'expired'],
    required: false,
  })
  @IsOptional()
  @IsString()
  @IsIn(['scheduled', 'active', 'expired'])
  status?: string;

  @ApiProperty({
    description: 'Danh sách product IDs áp dụng promotion (optional)',
    example: [1, 2, 3],
    required: false,
    type: [Number],
  })
  @IsOptional()
  @IsNumber({}, { each: true })
  product_ids?: number[];
}
