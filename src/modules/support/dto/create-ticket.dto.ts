import { IsString, IsOptional, IsIn } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateTicketDto {
  @ApiProperty({ description: 'Tên khách hàng', example: 'Nguyễn Văn A' })
  @IsString()
  customer_name: string;

  @ApiProperty({ description: 'Email khách hàng', example: 'customer@example.com' })
  @IsString()
  customer_email: string;

  @ApiProperty({ description: 'Tiêu đề yêu cầu', example: 'Cần hỗ trợ về đơn hàng' })
  @IsString()
  subject: string;

  @ApiProperty({ description: 'Nội dung chi tiết', example: 'Tôi muốn hỏi về trạng thái đơn hàng #12345' })
  @IsString()
  message: string;

  @ApiProperty({
    description: 'Mức độ ưu tiên',
    example: 'medium',
    enum: ['low', 'medium', 'high', 'urgent'],
    required: false,
    default: 'medium'
  })
  @IsOptional()
  @IsString()
  @IsIn(['low', 'medium', 'high', 'urgent'])
  priority?: string;
}
