import { IsInt, IsPositive } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class AddToWishlistDto {
  @ApiProperty({ description: 'ID variant (size + color)', example: 1 })
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  variant_id: number;
}
