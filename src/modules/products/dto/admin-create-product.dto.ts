import { IsString, IsNumber, IsOptional, Min, IsArray, ValidateNested, IsBoolean } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreateProductVariantDto {
  @ApiProperty({ description: 'SKU biến thể', example: 'TEE-BASIC-BLK-M' })
  @IsString()
  sku: string;

  @ApiProperty({ description: 'Size ID (Foreign Key to sizes table)', example: 1 })
  @IsNumber()
  size_id: number;

  @ApiProperty({ description: 'Color ID (Foreign Key to colors table)', example: 1 })
  @IsNumber()
  color_id: number;

  @ApiProperty({ description: 'Số lượng tồn kho', example: 100 })
  @IsNumber()
  @Min(0)
  stock: number;

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

export class CreateProductImageDto {
  @ApiProperty({ description: 'URL ảnh', example: 'https://example.com/image.jpg' })
  @IsString()
  image_url: string;

  @ApiProperty({ description: 'Ảnh chính', example: true, default: false })
  @IsOptional()
  @IsBoolean()
  is_primary?: boolean;

  @ApiProperty({ description: 'Thứ tự hiển thị', example: 0, required: false })
  @IsOptional()
  @IsNumber()
  display_order?: number;
}

export class CreateProductDto {
  @ApiProperty({ description: 'Tên sản phẩm', example: 'iPhone 15 Pro Max' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'SKU', example: 'IP15PM-256-BLK' })
  @IsString()
  sku: string;

  @ApiProperty({
    description: 'Mô tả ngắn',
    example: 'Điện thoại iPhone 15 Pro Max',
    required: false,
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    description: 'Mô tả đầy đủ',
    example: 'Điện thoại iPhone 15 Pro Max 256GB màu đen với chip A17 Pro...',
    required: false,
  })
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

  @ApiProperty({ description: 'Giá bán', example: 29990000 })
  @IsNumber()
  @Min(0)
  selling_price: number;

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
    description: 'Danh sách biến thể (size_id, color_id, stock)',
    type: [CreateProductVariantDto],
    required: false,
    example: [
      { sku: 'TEE-BASIC-BLK-M', size_id: 1, color_id: 2, stock: 100 },
      { sku: 'TEE-BASIC-BLK-L', size_id: 2, color_id: 2, stock: 50 }
    ]
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateProductVariantDto)
  variants?: CreateProductVariantDto[];

  @ApiProperty({
    description: 'Danh sách ảnh sản phẩm',
    type: [CreateProductImageDto],
    required: false,
    example: [
      { image_url: 'https://example.com/image1.jpg', is_primary: true, display_order: 0 },
      { image_url: 'https://example.com/image2.jpg', is_primary: false, display_order: 1 }
    ]
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateProductImageDto)
  images?: CreateProductImageDto[];
}
