import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class AddToWishlistDto {
  @ApiProperty({ description: 'ID sản phẩm', example: 'prod_1234567890' })
  @IsString()
  product_id: string;
}
