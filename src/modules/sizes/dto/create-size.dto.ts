import { IsNotEmpty, IsString, IsInt, IsOptional, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateSizeDto {
  @ApiProperty({
    example: 'XL',
    description: 'Tên size',
  })
  @IsNotEmpty({ message: 'Tên size không được để trống' })
  @IsString()
  name: string;

  @ApiProperty({
    example: 4,
    description: 'Thứ tự sắp xếp',
    default: 0,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  sort_order?: number;
}
