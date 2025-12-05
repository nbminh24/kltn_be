import { IsString, IsEmail, IsOptional, IsNumber, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateTicketDto {
  @ApiProperty({ description: 'Email liên hệ (tự động lấy nếu đã đăng nhập)', example: 'customer@example.com', required: false })
  @IsOptional()
  @IsEmail()
  customer_email?: string;

  @ApiProperty({ description: 'Tiêu đề yêu cầu hỗ trợ', example: 'Cần hỗ trợ về đơn hàng' })
  @IsString()
  subject: string;

  @ApiProperty({ description: 'Nội dung yêu cầu hỗ trợ', example: 'Tôi cần hỗ trợ về đơn hàng #123...' })
  @IsString()
  @IsNotEmpty()
  message: string;

  @ApiProperty({
    description: 'ID khách hàng (nếu đã đăng nhập)',
    example: 1,
    required: false
  })
  @IsOptional()
  @IsNumber()
  customer_id?: number;
}
