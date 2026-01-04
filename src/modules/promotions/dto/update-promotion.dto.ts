import { IsString, IsNumber, IsOptional, IsIn, IsDateString, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdatePromotionDto {
  @ApiProperty({
    description: 'Loại giảm giá',
    example: 'percentage',
    enum: ['percentage', 'fixed'],
    required: false,
  })
  @IsOptional()
  @IsString()
  @IsIn(['percentage', 'fixed'])
  type?: string;

  @ApiProperty({
    description: 'Giá trị giảm',
    example: 15,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  discount_value?: number;

  @ApiProperty({
    description: 'Giá trị đơn hàng tối thiểu',
    example: 300000,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  min_order_value?: number;

  @ApiProperty({
    description: 'Giới hạn số lần sử dụng',
    example: 200,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  usage_limit?: number;

  @ApiProperty({
    description: 'Ngày bắt đầu',
    example: '2024-02-01',
    required: false,
  })
  @IsOptional()
  @IsDateString()
  start_date?: string;

  @ApiProperty({
    description: 'Ngày hết hạn',
    example: '2024-12-31',
    required: false,
  })
  @IsOptional()
  @IsDateString()
  expiry_date?: string;

  @ApiProperty({
    description: 'Trạng thái',
    example: 'Active',
    enum: ['Active', 'Inactive'],
    required: false,
  })
  @IsOptional()
  @IsString()
  @IsIn(['Active', 'Inactive'])
  status?: string;
}
