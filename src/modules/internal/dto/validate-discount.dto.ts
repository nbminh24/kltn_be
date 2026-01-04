import { IsArray, ArrayNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ValidateDiscountDto {
  @ApiProperty({
    description: 'Danh sách ID sản phẩm trong giỏ hàng',
    example: [123, 456],
    type: [Number],
  })
  @IsArray()
  @ArrayNotEmpty()
  product_ids_in_cart: number[];
}
