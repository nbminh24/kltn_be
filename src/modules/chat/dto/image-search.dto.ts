import { ApiProperty } from '@nestjs/swagger';

export class ImageSearchResultDto {
  @ApiProperty({ description: 'Product ID' })
  product_id: number;

  @ApiProperty({ description: 'Image URL từ Image Search Service' })
  image_url: string;

  @ApiProperty({ description: 'Similarity score (0-1)', example: 0.95 })
  similarity_score: number;
}

export class ImageSearchResponseDto {
  @ApiProperty({ description: 'Success status' })
  success: boolean;

  @ApiProperty({
    description: 'Search results',
    type: [ImageSearchResultDto],
  })
  results: ImageSearchResultDto[];

  @ApiProperty({ description: 'Query time in milliseconds', example: 245 })
  query_time_ms?: number;
}

export class ProductSearchResultDto {
  @ApiProperty({ description: 'Product ID' })
  id: number;

  @ApiProperty({ description: 'Product name' })
  name: string;

  @ApiProperty({ description: 'Selling price' })
  selling_price: number;

  @ApiProperty({ description: 'Product thumbnail URL' })
  thumbnail_url: string;

  @ApiProperty({ description: 'Product slug for link' })
  slug: string;

  @ApiProperty({ description: 'Similarity score', example: 0.95 })
  similarity_score: number;

  @ApiProperty({ description: 'Image URL từ search result' })
  matched_image_url: string;
}
