import { IsOptional, IsString, IsInt, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateSizeDto {
  @ApiProperty({
    example: 'XXL',
    description: 'Tên size mới',
    required: false,
  })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({
    example: 5,
    description: 'Thứ tự sắp xếp mới',
    required: false,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  sort_order?: number;
}
