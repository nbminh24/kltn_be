import { IsInt, IsPositive, IsString, IsOptional, IsIn } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreateOrderDto {
  @ApiProperty({
    description: 'ID địa chỉ giao hàng đã lưu',
    example: 1,
  })
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  customer_address_id: number;

  @ApiProperty({
    description: 'Phương thức thanh toán',
    example: 'cod',
    enum: ['cod', 'vnpay'],
  })
  @IsString()
  @IsIn(['cod', 'vnpay'])
  payment_method: string;

  @ApiProperty({
    description: 'Phí vận chuyển',
    example: 30000,
    required: false,
  })
  @Type(() => Number)
  @IsInt()
  @IsOptional()
  shipping_fee?: number;
}
