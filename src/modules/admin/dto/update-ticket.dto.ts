import { IsString, IsOptional, IsIn } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateTicketDto {
  @ApiProperty({
    description: 'Trạng thái ticket',
    example: 'in_progress',
    enum: ['pending', 'in_progress', 'resolved', 'closed'],
    required: false,
  })
  @IsOptional()
  @IsString()
  @IsIn(['pending', 'in_progress', 'resolved', 'closed'])
  status?: string;

  @ApiProperty({
    description: 'Mức độ ưu tiên',
    example: 'high',
    enum: ['low', 'medium', 'high', 'urgent'],
    required: false,
  })
  @IsOptional()
  @IsString()
  @IsIn(['low', 'medium', 'high', 'urgent'])
  priority?: string;

  @ApiProperty({
    description: 'Nội dung phản hồi từ admin',
    example: 'Cảm ơn bạn đã liên hệ. Chúng tôi sẽ xử lý trong 24h.',
    required: false,
  })
  @IsOptional()
  @IsString()
  admin_reply?: string;
}
