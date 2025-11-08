import { IsNumber, IsOptional, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AddToCartDto {
  @ApiProperty({ description: 'ID biến thể sản phẩm (màu, size)', example: 1 })
  @IsNumber()
  variant_id: number;

  @ApiProperty({ description: 'Số lượng', example: 1, default: 1 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  quantity?: number;
}
