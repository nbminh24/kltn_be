import { IsString, IsNumber, IsOptional, Min, IsArray, ValidateNested } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class UpdateVariantDto {
  @ApiProperty({ description: 'ID của variant', example: 1, required: false })
  @IsOptional()
  @IsNumber()
  variant_id?: number;

  @ApiProperty({ description: 'SKU', example: 'PROD-BLK-XL', required: false })
  @IsOptional()
  @IsString()
  sku?: string;

  @ApiProperty({ description: 'Size ID', example: 1, required: false })
  @IsOptional()
  @IsNumber()
  size_id?: number;

  @ApiProperty({ description: 'Size', example: 'XL', required: false })
  @IsOptional()
  @IsString()
  size?: string;

  @ApiProperty({ description: 'Color ID', example: 1, required: false })
  @IsOptional()
  @IsNumber()
  color_id?: number;

  @ApiProperty({ description: 'Màu sắc', example: 'Đen', required: false })
  @IsOptional()
  @IsString()
  color?: string;

  @ApiProperty({ description: 'Số lượng tồn kho', example: 50, required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  stock?: number;

  @ApiProperty({
    description: 'Trạng thái',
    example: 'active',
    enum: ['active', 'inactive'],
    required: false,
  })
  @IsOptional()
  @IsString()
  status?: string;
}

export class UpdateProductDto {
  @ApiProperty({ description: 'Tên sản phẩm', example: 'iPhone 15 Pro Max', required: false })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({ description: 'Mô tả ngắn', example: 'Điện thoại iPhone 15 Pro Max', required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ description: 'Mô tả đầy đủ', example: 'Điện thoại iPhone 15 Pro Max 256GB màu đen với chip A17 Pro...', required: false })
  @IsOptional()
  @IsString()
  full_description?: string;

  @ApiProperty({ description: 'ID danh mục', example: 1, required: false })
  @IsOptional()
  @IsNumber()
  category_id?: number;

  @ApiProperty({ description: 'Giá vốn', example: 20000000, required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  cost_price?: number;

  @ApiProperty({ description: 'Giá bán', example: 29990000, required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  selling_price?: number;

  @ApiProperty({ description: 'Giá bán (alias)', example: 29990000, required: false })
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

  @ApiProperty({
    description: 'Danh sách ID của sizes được chọn',
    example: [1, 2, 3],
    required: false,
  })
  @IsOptional()
  @IsArray()
  selected_size_ids?: number[];

  @ApiProperty({
    description: 'Danh sách ID của colors được chọn',
    example: [1, 2],
    required: false,
  })
  @IsOptional()
  @IsArray()
  selected_color_ids?: number[];

  @ApiProperty({
    description: 'Danh sách biến thể cần cập nhật',
    type: [UpdateVariantDto],
    required: false,
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpdateVariantDto)
  variants?: UpdateVariantDto[];
}
