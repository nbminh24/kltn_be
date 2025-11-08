import {
  IsOptional,
  IsString,
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

export class UpdateProductDto {
  @ApiProperty({
    example: 'Áo Khoác Bomber (Updated)',
    description: 'Tên sản phẩm mới',
    required: false,
  })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({
    example: 'Mô tả mới',
    required: false,
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    example: 'Mô tả chi tiết mới',
    required: false,
  })
  @IsOptional()
  @IsString()
  full_description?: string;

  @ApiProperty({
    example: 220000,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  cost_price?: number;

  @ApiProperty({
    example: 460000,
    required: false,
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  selling_price?: number;

  @ApiProperty({
    example: 3,
    required: false,
  })
  @IsOptional()
  @IsInt()
  category_id?: number;

  @ApiProperty({
    example: 'active',
    enum: ['active', 'inactive'],
    required: false,
  })
  @IsOptional()
  @IsIn(['active', 'inactive'])
  status?: string;

  @ApiProperty({
    example: [2],
    description: 'Danh sách ID các size (bỏ chọn size nào thì variants tương ứng sẽ inactive)',
    type: [Number],
    required: false,
  })
  @IsOptional()
  @IsArray()
  @ArrayNotEmpty()
  @IsInt({ each: true })
  selected_size_ids?: number[];

  @ApiProperty({
    example: [1],
    description: 'Danh sách ID các color (bỏ chọn color nào thì variants tương ứng sẽ inactive)',
    type: [Number],
    required: false,
  })
  @IsOptional()
  @IsArray()
  @ArrayNotEmpty()
  @IsInt({ each: true })
  selected_color_ids?: number[];

  @ApiProperty({
    example: [
      { variant_id: 10, size_id: 2, color_id: 1, sku: 'BOM-M-WHT', status: 'active' },
    ],
    description: 'Danh sách variants cần cập nhật trạng thái riêng lẻ',
    type: [VariantDto],
    required: false,
  })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => VariantDto)
  variants?: VariantDto[];
}
