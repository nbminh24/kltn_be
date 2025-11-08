import { IsString, IsNumber, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateVariantDto {
  @ApiProperty({ description: 'SKU biến thể', example: 'TEE-BASIC-BLK-XL' })
  @IsString()
  sku: string;

  @ApiProperty({ description: 'Size', example: 'XL' })
  @IsString()
  size: string;

  @ApiProperty({ description: 'Màu sắc', example: 'Đen' })
  @IsString()
  color: string;

  @ApiProperty({ description: 'Số lượng tồn kho', example: 50 })
  @IsNumber()
  @Min(0)
  stock: number;
}
