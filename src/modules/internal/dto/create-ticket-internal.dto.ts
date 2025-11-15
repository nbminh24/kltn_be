import { IsString, IsOptional, IsIn, IsNumber } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateTicketInternalDto {
    @ApiProperty({
        description: 'Order ID liên quan (nếu có)',
        example: 123,
        required: false,
    })
    @IsOptional()
    @IsNumber()
    order_id?: number;

    @ApiProperty({
        description: 'User ID người tạo ticket',
        example: 456,
    })
    @IsNumber()
    user_id: number;

    @ApiProperty({
        description: 'Loại vấn đề',
        example: 'missing_item',
        enum: ['missing_item', 'wrong_item', 'damaged_item', 'late_delivery', 'other'],
    })
    @IsString()
    @IsIn(['missing_item', 'wrong_item', 'damaged_item', 'late_delivery', 'other'])
    issue_type: string;

    @ApiProperty({
        description: 'SKU sản phẩm có vấn đề (optional)',
        example: 'BELT-BLACK',
        required: false,
    })
    @IsOptional()
    @IsString()
    product_sku?: string;

    @ApiProperty({
        description: 'Mô tả chi tiết vấn đề',
        example: 'Khách báo thiếu thắt lưng đen trong đơn hàng',
    })
    @IsString()
    description: string;
}
