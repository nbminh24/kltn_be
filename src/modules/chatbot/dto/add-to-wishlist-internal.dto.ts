import { IsInt, IsPositive } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO for internal add to wishlist API (used by Rasa chatbot)
 */
export class AddToWishlistInternalDto {
  @ApiProperty({
    example: 123,
    description: 'Customer ID who owns the wishlist',
  })
  @IsInt()
  @IsPositive()
  customer_id: number;

  @ApiProperty({
    example: 456,
    description: 'Product variant ID to add to wishlist',
  })
  @IsInt()
  @IsPositive()
  variant_id: number;
}
