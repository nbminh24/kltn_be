import { IsNumber, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateCartItemDto {
  @ApiProperty({ description: 'Số lượng mới', example: 3 })
  @IsNumber()
  @Min(1)
  quantity: number;
}
