import { IsString, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdatePageDto {
  @ApiProperty({ description: 'Tiêu đề trang', example: 'Về chúng tôi', required: false })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiProperty({
    description: 'Nội dung trang (HTML)',
    example: '<h1>Về chúng tôi</h1><p>Chúng tôi là...</p>',
    required: false,
  })
  @IsOptional()
  @IsString()
  content?: string;

  @ApiProperty({
    description: 'Trạng thái',
    example: 'Published',
    enum: ['Published', 'Draft'],
    required: false,
  })
  @IsOptional()
  @IsString()
  status?: string;
}
