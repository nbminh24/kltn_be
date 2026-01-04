import { IsString, IsNumber, IsOptional, Min, Max } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateReviewDto {
  @ApiProperty({ description: 'Điểm đánh giá', example: 5, minimum: 1, maximum: 5 })
  @IsNumber()
  @Min(1)
  @Max(5)
  rating: number;

  @ApiProperty({ description: 'Tiêu đề đánh giá', example: 'Sản phẩm tốt', required: false })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiProperty({
    description: 'Nội dung đánh giá',
    example: 'Sản phẩm chất lượng, giao hàng nhanh',
  })
  @IsString()
  comment: string;
}
