import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreatePaymentUrlDto {
  @ApiProperty({ description: 'Order ID' })
  @IsNotEmpty()
  @IsNumber()
  order_id: number;

  @ApiPropertyOptional({ description: 'Mã ngân hàng (NCB, VISA, ...)', example: 'NCB' })
  @IsOptional()
  @IsString()
  bank_code?: string;
}
