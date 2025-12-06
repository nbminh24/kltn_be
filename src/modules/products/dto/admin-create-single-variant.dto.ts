import { IsNumber, IsString, IsOptional, Min, IsIn } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateSingleVariantDto {
    @ApiProperty({ description: 'Size ID', example: 1 })
    @IsNumber()
    size_id: number;

    @ApiProperty({ description: 'Color ID', example: 3 })
    @IsNumber()
    color_id: number;

    @ApiProperty({ description: 'SKU', example: 'AO-XS-RED', required: false })
    @IsOptional()
    @IsString()
    sku?: string;

    @ApiProperty({ description: 'Số lượng tồn kho', example: 100 })
    @IsNumber()
    @Min(0)
    total_stock: number;

    @ApiProperty({
        description: 'Trạng thái',
        example: 'active',
        enum: ['active', 'inactive'],
        required: false,
    })
    @IsOptional()
    @IsString()
    @IsIn(['active', 'inactive'])
    status?: string;
}
