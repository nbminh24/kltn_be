import { IsOptional, IsString, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateColorDto {
  @ApiProperty({
    example: 'Đen Nhám',
    description: 'Tên màu mới',
    required: false,
  })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({
    example: '#111111',
    description: 'Mã màu hex mới',
    required: false,
  })
  @IsOptional()
  @IsString()
  @Matches(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, {
    message: 'Mã màu hex không hợp lệ (ví dụ: #FFFFFF hoặc #FFF)',
  })
  hex_code?: string;
}
