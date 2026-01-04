import { IsString, IsIn, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateOrderStatusDto {
  @ApiProperty({
    description: 'Trạng thái đơn hàng',
    example: 'Confirmed',
    enum: ['Pending', 'Confirmed', 'Processing', 'Shipped', 'Delivered', 'Cancelled'],
  })
  @IsString()
  @IsIn(['Pending', 'Confirmed', 'Processing', 'Shipped', 'Delivered', 'Cancelled'])
  status: string;

  @ApiPropertyOptional({
    description: 'Ghi chú về thay đổi trạng thái',
    example: 'Đã liên hệ khách hàng xác nhận địa chỉ',
  })
  @IsOptional()
  @IsString()
  note?: string;
}
