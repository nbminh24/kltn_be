import { IsString, IsNumber, IsOptional, IsIn, IsDateString, Min, Max } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreatePromotionDto {
  @ApiProperty({ 
    description: 'Mã giảm giá (UPPERCASE, không dấu, 3-20 ký tự)', 
    example: 'SUMMER2024' 
  })
  @IsString()
  code: string;

  @ApiProperty({ 
    description: 'Loại giảm giá', 
    example: 'percentage',
    enum: ['percentage', 'fixed']
  })
  @IsString()
  @IsIn(['percentage', 'fixed'])
  type: string;

  @ApiProperty({ 
    description: 'Giá trị giảm (% nếu percentage, số tiền nếu fixed)', 
    example: 10 
  })
  @IsNumber()
  @Min(0)
  discount_value: number;

  @ApiProperty({ 
    description: 'Giá trị đơn hàng tối thiểu', 
    example: 200000,
    required: false,
    default: 0
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  min_order_value?: number;

  @ApiProperty({ 
    description: 'Giới hạn số lần sử dụng (null = không giới hạn)', 
    example: 100,
    required: false
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  usage_limit?: number;

  @ApiProperty({ 
    description: 'Ngày bắt đầu (YYYY-MM-DD)', 
    example: '2024-01-01',
    required: false
  })
  @IsOptional()
  @IsDateString()
  start_date?: string;

  @ApiProperty({ 
    description: 'Ngày hết hạn (YYYY-MM-DD)', 
    example: '2024-12-31',
    required: false
  })
  @IsOptional()
  @IsDateString()
  expiry_date?: string;

  @ApiProperty({ 
    description: 'Trạng thái', 
    example: 'Active',
    enum: ['Active', 'Inactive'],
    required: false,
    default: 'Active'
  })
  @IsOptional()
  @IsString()
  @IsIn(['Active', 'Inactive'])
  status?: string;
}
