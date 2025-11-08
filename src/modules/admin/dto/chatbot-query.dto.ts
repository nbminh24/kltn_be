import { IsOptional, IsString, IsIn } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ChatbotQueryDto {
  @ApiProperty({ 
    description: 'Trang hiện tại', 
    example: 1, 
    required: false 
  })
  @IsOptional()
  page?: number;

  @ApiProperty({ 
    description: 'Số lượng mỗi trang', 
    example: 20, 
    required: false 
  })
  @IsOptional()
  limit?: number;

  @ApiProperty({ 
    description: 'Lọc theo trạng thái resolved', 
    example: 'false',
    enum: ['true', 'false'],
    required: false 
  })
  @IsOptional()
  @IsString()
  @IsIn(['true', 'false'])
  resolved?: string;

  @ApiProperty({ 
    description: 'Tìm kiếm trong nội dung', 
    example: 'order tracking',
    required: false 
  })
  @IsOptional()
  @IsString()
  search?: string;
}
