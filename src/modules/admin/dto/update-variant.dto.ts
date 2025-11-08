import { IsString, IsNumber, IsOptional, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateVariantDto {
  @ApiProperty({ description: 'Size', example: 'XL', required: false })
  @IsOptional()
  @IsString()
  size?: string;

  @ApiProperty({ description: 'Màu sắc', example: 'Đen', required: false })
  @IsOptional()
  @IsString()
  color?: string;

  @ApiProperty({ description: 'Số lượng tồn kho', example: 50, required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  stock?: number;
}
