import { IsArray, IsInt, Min, ValidateNested } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class RestockItemDto {
  @ApiProperty({ example: 101 })
  @IsInt()
  variant_id: number;

  @ApiProperty({ example: 50 })
  @IsInt()
  @Min(1)
  quantity: number;
}

export class RestockDto {
  @ApiProperty({
    example: [
      { variant_id: 101, quantity: 50 },
      { variant_id: 102, quantity: 30 },
    ],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => RestockItemDto)
  items: RestockItemDto[];
}
