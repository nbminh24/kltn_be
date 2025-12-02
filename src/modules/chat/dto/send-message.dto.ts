import { IsNotEmpty, IsNumber, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SendMessageDto {
    @ApiProperty({ description: 'Chat session ID' })
    @IsNotEmpty()
    @IsNumber()
    session_id: number;

    @ApiProperty({ description: 'Message content' })
    @IsNotEmpty()
    @IsString()
    message: string;
}
