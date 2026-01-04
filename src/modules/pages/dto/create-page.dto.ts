import { IsString, IsNotEmpty, IsOptional, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreatePageDto {
  @ApiProperty({ example: 'Chính sách đổi trả' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  title: string;

  @ApiProperty({ example: 'chinh-sach-doi-tra' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  slug: string;

  @ApiProperty({ example: '<p>Nội dung HTML...</p>', required: false })
  @IsOptional()
  @IsString()
  content?: string;

  @ApiProperty({ example: 'Published', required: false, default: 'Draft' })
  @IsOptional()
  @IsString()
  status?: string;
}
