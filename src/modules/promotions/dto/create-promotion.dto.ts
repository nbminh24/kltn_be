import { IsString, IsNumber, IsOptional, IsIn, IsDateString, Min, MaxLength, ValidateIf } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';

export class CreatePromotionDto {
  @ApiProperty({
    description: 'Tên khuyến mãi',
    example: 'Summer Sale 2024',
    maxLength: 255,
  })
  @IsString()
  @MaxLength(255)
  name: string;

  @ApiProperty({
    description: 'Loại khuyến mãi',
    example: 'voucher',
    enum: ['voucher', 'flash_sale'],
  })
  @IsString()
  @IsIn(['voucher', 'flash_sale'])
  type: string;

  @ApiProperty({
    description: 'Giá trị giảm giá',
    example: 20,
  })
  @IsNumber()
  @Min(0.01, { message: 'discount_value must be greater than 0' })
  discount_value: number;

  @ApiProperty({
    description: 'Kiểu giảm giá',
    example: 'percentage',
    enum: ['percentage', 'fixed_amount'],
  })
  @IsString()
  @IsIn(['percentage', 'fixed_amount'])
  discount_type: string;

  @ApiProperty({
    description: 'Giới hạn số lượng (0 = không giới hạn)',
    example: 100,
    required: false,
    default: 0,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  number_limited?: number;

  @ApiProperty({
    description: 'Ngày bắt đầu (YYYY-MM-DD)',
    example: '2026-01-10',
  })
  @IsDateString({}, { message: 'start_date must be a valid ISO date string (YYYY-MM-DD)' })
  start_date: string;

  @ApiProperty({
    description: 'Ngày kết thúc (YYYY-MM-DD)',
    example: '2026-01-31',
  })
  @IsDateString({}, { message: 'end_date must be a valid ISO date string (YYYY-MM-DD)' })
  @Transform(({ value, obj }) => {
    if (value && obj.start_date && new Date(value) < new Date(obj.start_date)) {
      throw new Error('end_date must be greater than or equal to start_date');
    }
    return value;
  })
  end_date: string;

  @ApiProperty({
    description: 'Danh sách product IDs áp dụng promotion (optional, nếu không có = áp dụng cho tất cả)',
    example: [1, 2, 3],
    required: false,
    type: [Number],
  })
  @IsOptional()
  @IsNumber({}, { each: true })
  product_ids?: number[];
}
