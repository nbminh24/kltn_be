import { IsInt, IsPositive } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreatePaymentUrlDto {
  @ApiProperty({ 
    description: 'ID đơn hàng vừa tạo',
    example: 1,
  })
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  order_id: number;
}
