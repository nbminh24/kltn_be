import { IsOptional, IsString, IsIn } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateCategoryDto {
  @ApiProperty({
    example: 'Quần Shorts Nam',
    description: 'Tên category mới (optional)',
    required: false,
  })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({
    example: 'active',
    description: 'Trạng thái category (optional)',
    enum: ['active', 'inactive'],
    required: false,
  })
  @IsOptional()
  @IsIn(['active', 'inactive'], { message: 'Status phải là "active" hoặc "inactive"' })
  status?: string;
}
