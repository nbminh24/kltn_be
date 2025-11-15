import { IsNumber, Min, Max } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SizingAdviceDto {
  @ApiProperty({
    description: 'ID sản phẩm cần tư vấn size',
    example: 123,
  })
  @IsNumber()
  product_id: number;

  @ApiProperty({
    description: 'Chiều cao (cm)',
    example: 175,
    minimum: 100,
    maximum: 250,
  })
  @IsNumber()
  @Min(100)
  @Max(250)
  height: number;

  @ApiProperty({
    description: 'Cân nặng (kg)',
    example: 70,
    minimum: 30,
    maximum: 200,
  })
  @IsNumber()
  @Min(30)
  @Max(200)
  weight: number;
}
