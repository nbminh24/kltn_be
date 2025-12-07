import { IsInt, IsPositive, Min, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO for internal add to cart API (used by Rasa chatbot)
 */
export class AddToCartInternalDto {
    @ApiProperty({
        example: 123,
        description: 'Customer ID who owns the cart'
    })
    @IsInt()
    @IsPositive()
    customer_id: number;

    @ApiProperty({
        example: 456,
        description: 'Product variant ID to add to cart'
    })
    @IsInt()
    @IsPositive()
    variant_id: number;

    @ApiProperty({
        example: 1,
        default: 1,
        description: 'Quantity of items to add',
        required: false
    })
    @IsInt()
    @Min(1)
    @IsOptional()
    quantity?: number = 1;
}
