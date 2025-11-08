import {
  IsNotEmpty,
  IsString,
  IsOptional,
  IsNumber,
  IsInt,
  IsArray,
  ArrayNotEmpty,
  ValidateNested,
  IsIn,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { VariantDto } from './variant.dto';

export class CreateProductDto {
  @ApiProperty({
    example: 'Áo Khoác Bomber',
    description: 'Tên sản phẩm',
  })
  @IsNotEmpty({ message: 'Tên sản phẩm không được để trống' })
  @IsString()
  name: string;

  @ApiProperty({
    example: 'Áo khoác bomber thời trang',
    description: 'Mô tả ngắn',
    required: false,
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    example: 'Áo khoác bomber cao cấp, chất liệu vải dù...',
    description: 'Mô tả chi tiết',
    required: false,
  })
  @IsOptional()
  @IsString()
  full_description?: string;

  @ApiProperty({
    example: 200000,
    description: 'Giá vốn',
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  cost_price?: number;

  @ApiProperty({
    example: 450000,
    description: 'Giá bán (đồng giá cho tất cả variants)',
  })
  @IsNotEmpty({ message: 'Giá bán không được để trống' })
  @IsNumber()
  @Min(0)
  selling_price: number;

  @ApiProperty({
    example: 2,
    description: 'ID danh mục',
    required: false,
  })
  @IsOptional()
  @IsInt()
  category_id?: number;

  @ApiProperty({
    example: 'active',
    description: 'Trạng thái sản phẩm',
    enum: ['active', 'inactive'],
    default: 'active',
  })
  @IsOptional()
  @IsIn(['active', 'inactive'])
  status?: string;

  @ApiProperty({
    example: [2, 3],
    description: 'Danh sách ID các size đã chọn',
    type: [Number],
  })
  @IsArray()
  @ArrayNotEmpty({ message: 'Phải chọn ít nhất 1 size' })
  @IsInt({ each: true })
  selected_size_ids: number[];

  @ApiProperty({
    example: [1, 2],
    description: 'Danh sách ID các color đã chọn',
    type: [Number],
  })
  @IsArray()
  @ArrayNotEmpty({ message: 'Phải chọn ít nhất 1 color' })
  @IsInt({ each: true })
  selected_color_ids: number[];

  @ApiProperty({
    example: [
      { size_id: 2, color_id: 1, sku: 'BOM-M-WHT', status: 'active' },
      { size_id: 3, color_id: 1, sku: 'BOM-L-WHT', status: 'active' },
    ],
    description: 'Ma trận biến thể (từ Step 2)',
    type: [VariantDto],
  })
  @IsArray()
  @ArrayNotEmpty({ message: 'Phải có ít nhất 1 variant' })
  @ValidateNested({ each: true })
  @Type(() => VariantDto)
  variants: VariantDto[];
}
