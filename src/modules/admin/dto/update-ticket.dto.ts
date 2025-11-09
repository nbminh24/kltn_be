import { IsString, IsOptional, IsIn } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateTicketDto {
  @ApiProperty({
    description: 'Trạng thái ticket',
    example: 'in_progress',
    enum: ['pending', 'in_progress', 'resolved', 'closed'],
    required: false,
  })
  @IsOptional()
  @IsString()
  @IsIn(['pending', 'in_progress', 'resolved', 'closed'])
  status?: string;
}
