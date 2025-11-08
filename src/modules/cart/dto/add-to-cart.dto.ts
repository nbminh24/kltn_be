import { IsString, IsNumber, IsOptional, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AddToCartDto {
  @ApiProperty({ description: 'ID sản phẩm', example: 'prod_1234567890' })
  @IsString()
  product_id: string;

  @ApiProperty({ 
    description: 'ID biến thể sản phẩm (màu, size)', 
    example: 'variant_1234567890',
    required: false 
  })
  @IsOptional()
  @IsString()
  product_variant_id?: string;

  @ApiProperty({ description: 'Số lượng', example: 1, default: 1 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  quantity?: number;
}
