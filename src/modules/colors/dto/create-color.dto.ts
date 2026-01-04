import { IsNotEmpty, IsString, IsOptional, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateColorDto {
  @ApiProperty({
    example: 'Xanh Navy',
    description: 'Tên màu',
  })
  @IsNotEmpty({ message: 'Tên màu không được để trống' })
  @IsString()
  name: string;

  @ApiProperty({
    example: '#000080',
    description: 'Mã màu hex (optional)',
    required: false,
  })
  @IsOptional()
  @IsString()
  @Matches(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, {
    message: 'Mã màu hex không hợp lệ (ví dụ: #FFFFFF hoặc #FFF)',
  })
  hex_code?: string;
}
