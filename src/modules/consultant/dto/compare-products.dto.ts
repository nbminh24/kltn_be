import { IsArray, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CompareProductsDto {
    @ApiProperty({
        description: 'Danh sách tên hoặc ID sản phẩm cần so sánh (tối đa 3)',
        example: ['Áo sơ mi A', 'Áo sơ mi B'],
        type: [String]
    })
    @IsNotEmpty()
    @IsArray()
    product_names: string[];
}
