import { IsOptional, IsString, IsIn } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateVariantDto {
  @ApiProperty({
    example: 'NEW-SKU-001',
    description: 'SKU mới',
    required: false,
  })
  @IsOptional()
  @IsString()
  sku?: string;

  @ApiProperty({
    example: 'inactive',
    description: 'Trạng thái mới',
    enum: ['active', 'inactive'],
    required: false,
  })
  @IsOptional()
  @IsIn(['active', 'inactive'])
  status?: string;
}
