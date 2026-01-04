import { IsIn } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateProductStatusDto {
  @ApiProperty({
    example: 'inactive',
    description: 'Trạng thái mới',
    enum: ['active', 'inactive'],
  })
  @IsIn(['active', 'inactive'], { message: 'Status phải là "active" hoặc "inactive"' })
  status: string;
}
