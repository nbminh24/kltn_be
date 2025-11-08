import { IsString, IsNumber, IsOptional, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateProductDto {
  @ApiProperty({ description: 'Tên sản phẩm', example: 'iPhone 15 Pro Max', required: false })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({
    description: 'Mô tả sản phẩm',
    example: 'Điện thoại iPhone 15 Pro Max 256GB màu đen',
    required: false,
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: 'ID danh mục', example: 'cat_01', required: false })
  @IsOptional()
  @IsString()
  category_id?: string;

  @ApiProperty({ description: 'Giá bán', example: 29990000, required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  price?: number;

  @ApiProperty({ description: 'Giá gốc (nếu có sale)', example: 34990000, required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  original_price?: number;

  @ApiProperty({
    description: 'Trạng thái',
    example: 'Active',
    enum: ['Active', 'Inactive', 'OutOfStock'],
    required: false,
  })
  @IsOptional()
  @IsString()
  status?: string;
}
