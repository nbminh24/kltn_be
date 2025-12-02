import { IsNotEmpty, IsNumber, IsOptional, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SizingAdviceDto {
    @ApiProperty({ description: 'Chiều cao (cm)', example: 170 })
    @IsNotEmpty()
    @IsNumber()
    @Min(100)
    height: number;

    @ApiProperty({ description: 'Cân nặng (kg)', example: 65 })
    @IsNotEmpty()
    @IsNumber()
    @Min(30)
    weight: number;

    @ApiProperty({ description: 'ID sản phẩm cụ thể (optional)', example: 10, required: false })
    @IsOptional()
    @IsNumber()
    product_id?: number;

    @ApiProperty({ description: 'Slug danh mục (optional)', example: 'ao-thun', required: false })
    @IsOptional()
    category_slug?: string;
}
