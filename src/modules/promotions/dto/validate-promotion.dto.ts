import { IsArray, IsNotEmpty, IsNumber, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ValidatePromotionDto {
    @ApiProperty({ description: 'Danh sách mã giảm giá cần validate', example: ['SALE30', 'NEW10'] })
    @IsNotEmpty()
    @IsArray()
    codes: string[];

    @ApiProperty({ description: 'Tổng tiền giỏ hàng (VNĐ)', example: 1000000 })
    @IsNotEmpty()
    @IsNumber()
    @Min(0)
    cart_total: number;
}
