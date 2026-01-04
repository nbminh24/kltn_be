import { IsInt, IsPositive, IsEnum, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO for internal cancel order API (used by Rasa chatbot)
 */
export enum CancelReason {
  CHANGED_MIND = 'changed_mind',
  ORDERED_WRONG_ITEM = 'ordered_wrong_item',
  WRONG_SIZE_COLOR = 'wrong_size_color',
  FOUND_BETTER_PRICE = 'found_better_price',
  DELIVERY_TOO_SLOW = 'delivery_too_slow',
  PAYMENT_ISSUE = 'payment_issue',
  DUPLICATE_ORDER = 'duplicate_order',
  OTHER = 'other',
}

export class CancelOrderInternalDto {
  @ApiProperty({
    example: 123,
    description: 'Customer ID who owns the order',
  })
  @IsInt()
  @IsPositive()
  customer_id: number;

  @ApiProperty({
    enum: CancelReason,
    description: 'Reason for order cancellation',
    example: 'changed_mind',
    required: false,
  })
  @IsEnum(CancelReason)
  @IsOptional()
  cancel_reason?: CancelReason;
}
