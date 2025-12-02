import { IsString, IsNotEmpty, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ReplyTicketDto {
  @ApiProperty({ example: 'Chúng tôi đã nhận được yêu cầu của bạn...' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(5000)
  body: string;
}
