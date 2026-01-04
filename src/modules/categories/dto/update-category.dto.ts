import { IsString, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateCategoryDto {
  @ApiProperty({ description: 'Tên danh mục', example: 'Điện thoại', required: false })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({
    description: 'Mô tả danh mục',
    example: 'Các sản phẩm điện thoại thông minh',
    required: false,
  })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    description: 'Trạng thái',
    example: 'Active',
    enum: ['Active', 'Inactive'],
    required: false,
  })
  @IsOptional()
  @IsString()
  status?: string;
}
