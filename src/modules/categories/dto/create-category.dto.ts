import { IsNotEmpty, IsString, IsOptional, IsIn } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateCategoryDto {
  @ApiProperty({
    example: 'Hoodies',
    description: 'Tên category',
  })
  @IsNotEmpty({ message: 'Tên category không được để trống' })
  @IsString()
  name: string;

  @ApiProperty({
    example: 'active',
    description: 'Trạng thái category',
    enum: ['active', 'inactive'],
    default: 'active',
  })
  @IsOptional()
  @IsIn(['active', 'inactive'], { message: 'Status phải là "active" hoặc "inactive"' })
  status?: string;
}
