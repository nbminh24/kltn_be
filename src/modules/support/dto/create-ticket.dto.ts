import { IsString, IsEmail, IsOptional, IsNumber } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateTicketDto {
  @ApiProperty({ description: 'Email liên hệ', example: 'customer@example.com' })
  @IsEmail()
  customer_email: string;

  @ApiProperty({ description: 'Tiêu đề yêu cầu hỗ trợ', example: 'Cần hỗ trợ về đơn hàng' })
  @IsString()
  subject: string;

  @ApiProperty({ 
    description: 'ID khách hàng (nếu đã đăng nhập)', 
    example: 1,
    required: false 
  })
  @IsOptional()
  @IsNumber()
  customer_id?: number;
}
