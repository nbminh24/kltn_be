import { IsInt, IsPositive } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO for internal cancel order API (used by Rasa chatbot)
 */
export class CancelOrderInternalDto {
    @ApiProperty({
        example: 123,
        description: 'Customer ID who owns the order'
    })
    @IsInt()
    @IsPositive()
    customer_id: number;
}
