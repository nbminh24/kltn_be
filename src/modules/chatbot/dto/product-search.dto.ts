import { IsString, IsOptional, IsInt, Min, Max } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ProductSearchDto {
  @ApiProperty({
    example: 'meow shirt',
    description: 'Search keywords for product name/description',
    required: true,
  })
  @IsString()
  query: string;

  @ApiProperty({
    example: 5,
    description: 'Number of results to return',
    default: 5,
    required: false,
  })
  @IsInt()
  @Min(1)
  @Max(20)
  @IsOptional()
  limit?: number = 5;

  @ApiProperty({
    example: 'ao-thun',
    description: 'Filter by category slug',
    required: false,
  })
  @IsString()
  @IsOptional()
  category?: string;
}
