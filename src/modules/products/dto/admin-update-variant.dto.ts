import { IsString, IsNumber, IsOptional, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateVariantDto {
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
