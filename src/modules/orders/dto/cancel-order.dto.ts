import { IsEnum, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

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

export class CancelOrderDto {
    @ApiProperty({
        enum: CancelReason,
        description: 'Reason for order cancellation',
        example: 'wrong_size_color',
    })
    @IsEnum(CancelReason, {
        message: 'Invalid cancellation reason. Must be one of: changed_mind, ordered_wrong_item, wrong_size_color, found_better_price, delivery_too_slow, payment_issue, duplicate_order, other',
    })
    @IsNotEmpty()
    cancel_reason: CancelReason;
}
