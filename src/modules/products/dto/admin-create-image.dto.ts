import { IsString, IsBoolean, IsNumber, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateImageDto {
  @ApiProperty({ description: 'URL ảnh', example: 'https://example.com/image.jpg' })
  @IsString()
  image_url: string;

  @ApiProperty({ description: 'Ảnh chính', example: false, required: false, default: false })
  @IsOptional()
  @IsBoolean()
  is_primary?: boolean;

  @ApiProperty({ description: 'Thứ tự hiển thị', example: 0, required: false })
  @IsOptional()
  @IsNumber()
  display_order?: number;
}
