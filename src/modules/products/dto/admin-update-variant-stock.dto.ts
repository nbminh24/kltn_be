import { IsNumber, IsString, IsOptional, Min, IsIn } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateVariantStockDto {
    @ApiProperty({
        description: 'Số lượng tồn kho mới',
        example: 150,
        required: false,
    })
    @IsOptional()
    @IsNumber()
    @Min(0, { message: 'Số lượng tồn kho phải >= 0' })
    total_stock?: number;

    @ApiProperty({
        description: 'Trạng thái variant',
        example: 'active',
        enum: ['active', 'inactive'],
        required: false,
    })
    @IsOptional()
    @IsString()
    @IsIn(['active', 'inactive'], { message: 'Status phải là active hoặc inactive' })
    status?: string;
}
