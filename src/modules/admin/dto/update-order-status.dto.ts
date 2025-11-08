import { IsString, IsIn } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateOrderStatusDto {
  @ApiProperty({
    description: 'Trạng thái đơn hàng',
    example: 'Confirmed',
    enum: ['Pending', 'Confirmed', 'Processing', 'Shipped', 'Delivered', 'Cancelled'],
  })
  @IsString()
  @IsIn(['Pending', 'Confirmed', 'Processing', 'Shipped', 'Delivered', 'Cancelled'])
  status: string;
}
