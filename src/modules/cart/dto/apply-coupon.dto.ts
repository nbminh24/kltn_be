import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ApplyCouponDto {
  @ApiProperty({ description: 'Mã giảm giá', example: 'SUMMER2024' })
  @IsString()
  code: string;
}
