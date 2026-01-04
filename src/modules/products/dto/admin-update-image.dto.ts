import { IsString, IsBoolean, IsNumber, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateImageDto {
  @ApiProperty({
    description: 'URL ảnh',
    example: 'https://example.com/image.jpg',
    required: false,
  })
  @IsOptional()
  @IsString()
  image_url?: string;

  @ApiProperty({ description: 'Ảnh chính', example: true, required: false })
  @IsOptional()
  @IsBoolean()
  is_primary?: boolean;

  @ApiProperty({ description: 'Thứ tự hiển thị', example: 1, required: false })
  @IsOptional()
  @IsNumber()
  display_order?: number;
}
