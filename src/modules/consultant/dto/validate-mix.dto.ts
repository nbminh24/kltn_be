import { IsArray, IsNotEmpty, IsNumber, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ValidateMixDto {
    @ApiProperty({
        description: 'Danh sách mã giảm giá cần kiểm tra gộp',
        example: ['SALE30', 'NEW10'],
        type: [String]
    })
    @IsNotEmpty()
    @IsArray()
    coupon_codes: string[];

    @ApiProperty({ description: 'Tổng giá trị giỏ hàng (VNĐ)', example: 500000 })
    @IsNotEmpty()
    @IsNumber()
    @Min(0)
    cart_value: number;
}
