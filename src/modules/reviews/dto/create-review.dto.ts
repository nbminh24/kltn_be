import { IsInt, IsNotEmpty, Min, Max, IsOptional, IsString, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateReviewDto {
  @ApiProperty({ example: 101, description: 'Order ID' })
  @IsInt()
  @IsNotEmpty()
  order_id: number;

  @ApiProperty({ example: 10, description: 'Product Variant ID' })
  @IsInt()
  @IsNotEmpty()
  variant_id: number;

  @ApiProperty({ example: 5, description: 'Rating from 1 to 5', minimum: 1, maximum: 5 })
  @IsInt()
  @Min(1)
  @Max(5)
  rating: number;

  @ApiProperty({ example: 'Sản phẩm rất tốt!', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  comment?: string;
}
