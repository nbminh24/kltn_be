import { IsInt, IsOptional, IsString, Min, Max } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO for size advice/recommendation API
 */
export class SizeAdviceDto {
  @ApiProperty({
    example: 170,
    description: 'Height in centimeters',
  })
  @IsInt()
  @Min(100)
  @Max(250)
  height: number;

  @ApiProperty({
    example: 65,
    description: 'Weight in kilograms',
  })
  @IsInt()
  @Min(30)
  @Max(200)
  weight: number;

  @ApiProperty({
    example: 'shirt',
    description: 'Product category for specific sizing',
    required: false,
  })
  @IsString()
  @IsOptional()
  category?: string;
}
