import { IsInt, IsNotEmpty, IsString, IsIn, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class VariantDto {
  @ApiProperty({
    example: 2,
    description: 'ID của size',
  })
  @IsInt()
  @IsNotEmpty()
  size_id: number;

  @ApiProperty({
    example: 1,
    description: 'ID của color',
  })
  @IsInt()
  @IsNotEmpty()
  color_id: number;

  @ApiProperty({
    example: 'TSH-M-WHT',
    description: 'SKU (unique globally) - Tự động generate nếu không cung cấp',
    required: false,
  })
  @IsOptional()
  @IsString()
  sku?: string;

  @ApiProperty({
    example: 'active',
    description: 'Trạng thái variant',
    enum: ['active', 'inactive'],
  })
  @IsIn(['active', 'inactive'])
  status: string;

  @ApiProperty({
    example: 10,
    description: 'ID của variant (chỉ dùng khi update)',
    required: false,
  })
  @IsOptional()
  @IsInt()
  variant_id?: number;
}
