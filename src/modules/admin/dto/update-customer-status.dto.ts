import { IsString, IsIn } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateCustomerStatusDto {
  @ApiProperty({ example: 'active', enum: ['active', 'inactive'] })
  @IsString()
  @IsIn(['active', 'inactive'])
  status: string;
}
